/**
 * Server read side (#407, spec §5): files `history`, the Setup GET extras,
 * match, clone counting, `CLI_OUTDATED` and redirects, end to end through the
 * route handlers against the real test database.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
		GITHUB_CLIENT_ID: 'test',
		GITHUB_CLIENT_SECRET: 'test',
		CLONE_SALT_SECRET: 'test-clone-salt'
	}
}));

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activities, setupClones, tags, teamMembers } from '$lib/server/db/schema';
import { hashSetupFile } from '@coati/content-hash';
import { createTeam } from '$lib/server/queries/teams';
import { updateSetupByIdWithSlugRedirects } from '$lib/server/queries/setups';
import { anonCloneKey } from '$lib/server/queries/clones';
import { createTestUser, deleteTestUsers } from '$lib/server/queries/__tests__/db-test-helpers';
import type { User } from '$lib/types';
import { POST as CREATE } from './+server';
import { PATCH as PATCH_BY_ID } from './[id]/+server';
import { POST as MATCH } from './match/+server';
import { GET as GET_SETUP, PATCH as PATCH_BY_OWNER_SLUG } from './[owner]/[slug]/+server';
import { GET as GET_FILES } from './[owner]/[slug]/files/+server';
import { POST as CLONE } from './[owner]/[slug]/clone/+server';
import { GET as GET_TEAM_SETUP } from '../teams/[slug]/setups/[setupSlug]/+server';
import { GET as GET_TEAM_FILES } from '../teams/[slug]/setups/[setupSlug]/files/+server';
import { POST as CLONE_TEAM } from '../teams/[slug]/setups/[setupSlug]/clone/+server';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

const FP_A = 'a'.repeat(64);
const FP_B = 'b'.repeat(64);
const FP_C = 'c'.repeat(64);

function uniq(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

type AnyHandler = (event: never) => Promise<Response>;

async function call(
	handler: AnyHandler,
	opts: {
		user?: User | null;
		method?: string;
		path: string;
		params: Record<string, string>;
		body?: unknown;
		cli?: string | null;
		ip?: string;
	}
) {
	const url = new URL(`http://localhost${opts.path}`);
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (opts.cli !== null) headers['X-Coati-CLI'] = opts.cli ?? '1.0.0';
	const event = {
		locals: { user: opts.user ?? null },
		params: opts.params,
		url,
		getClientAddress: () => opts.ip ?? '203.0.113.7',
		request: new Request(url, {
			method: opts.method ?? 'GET',
			headers,
			body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
		})
	};
	const res = await handler(event as never);
	const text = await res.text();
	return {
		status: res.status,
		location: res.headers.get('Location'),
		body: text ? JSON.parse(text) : null
	};
}

const CLAUDE = { path: 'CLAUDE.md', content: '# rules\n' };
const AGENTS = { path: 'AGENTS.md', content: '# agents\n' };
const CMD = { path: '.claude/commands/ship.md', content: 'ship it' };

describe.skipIf(!hasDatabase)('Server read side — integration', () => {
	const userIds: string[] = [];
	const tagNames: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(userIds.splice(0));
		if (tagNames.length > 0) await db.delete(tags).where(inArray(tags.name, tagNames.splice(0)));
	});

	async function user(): Promise<User> {
		const u = await createTestUser();
		userIds.push(u.id);
		return u as User;
	}

	async function create(owner: User, body: Record<string, unknown>) {
		const res = await call(CREATE as AnyHandler, {
			user: owner,
			method: 'POST',
			path: '/api/v1/setups',
			params: {},
			body: { slug: uniq('read'), ...body }
		});
		expect(res.status).toBe(201);
		return res.body.data.setup as { id: string; slug: string };
	}

	async function publish(owner: User, id: string, body: Record<string, unknown>) {
		const res = await call(PATCH_BY_ID as AnyHandler, {
			user: owner,
			method: 'PATCH',
			path: `/api/v1/setups/${id}`,
			params: { id },
			body
		});
		expect(res.status).toBe(200);
		return res.body.data;
	}

	function files(owner: User, slug: string, extra: Partial<Parameters<typeof call>[1]> = {}) {
		return call(GET_FILES as AnyHandler, {
			user: owner,
			path: `/api/v1/setups/${owner.username}/${slug}/files`,
			params: { owner: owner.username, slug },
			...extra
		});
	}

	function clone(owner: User, slug: string, as: User | null, ip?: string) {
		return call(CLONE as AnyHandler, {
			user: as,
			method: 'POST',
			path: `/api/v1/setups/${owner.username}/${slug}/clone`,
			params: { owner: owner.username, slug },
			ip
		});
	}

	describe('files', () => {
		it('returns the latest Revision, hashes and an ordered change log over 3 Revisions', async () => {
			const owner = await user();
			const setup = await create(owner, { files: [CLAUDE, AGENTS] });
			// Revision 2: AGENTS.md removed, CLAUDE.md changed.
			await publish(owner, setup.id, {
				baseRevision: 1,
				files: [{ ...CLAUDE, content: 'v2' }]
			});
			// Revision 3: AGENTS.md added back with its original content, command added.
			await publish(owner, setup.id, {
				baseRevision: 2,
				files: [{ ...CLAUDE, content: 'v2' }, AGENTS, CMD]
			});

			const res = await files(owner, setup.slug);
			expect(res.status).toBe(200);
			const h = (path: string, content: string) => hashSetupFile(path, content);
			expect(res.body.data.revision).toBe(3);
			expect(res.body.data.files.map((f: { path: string }) => f.path)).toEqual([
				'.claude/commands/ship.md',
				'AGENTS.md',
				'CLAUDE.md'
			]);
			expect(res.body.data.files[0]).toMatchObject({
				hash: await h(CMD.path, CMD.content),
				agent: 'claude-code',
				componentType: 'command',
				content: CMD.content
			});
			expect(res.body.data.history).toEqual({
				[CLAUDE.path]: [
					{ revision: 1, hash: await h(CLAUDE.path, CLAUDE.content) },
					{ revision: 2, hash: await h(CLAUDE.path, 'v2') }
				],
				[AGENTS.path]: [
					{ revision: 1, hash: await h(AGENTS.path, AGENTS.content) },
					{ revision: 2, hash: null },
					{ revision: 3, hash: await h(AGENTS.path, AGENTS.content) }
				],
				[CMD.path]: [{ revision: 3, hash: await h(CMD.path, CMD.content) }]
			});
		});
	});

	describe('CLI version check', () => {
		it('answers 426 for a missing or old header and 200 for a current one', async () => {
			const owner = await user();
			const setup = await create(owner, { files: [CLAUDE] });

			for (const cli of [null, '0.8.3', 'garbage']) {
				const res = await files(owner, setup.slug, { cli });
				expect(res.status, String(cli)).toBe(426);
				expect(res.body).toEqual({
					error: 'This version of coati is no longer supported. Run npm i -g @coati/sh@latest',
					code: 'CLI_OUTDATED'
				});
			}
			expect((await files(owner, setup.slug, { cli: '1.0.0' })).status).toBe(200);
			expect((await files(owner, setup.slug, { cli: '1.4.2' })).status).toBe(200);
		});

		it('guards publish, match and clone too, but not the Setup GET', async () => {
			const owner = await user();
			const setup = await create(owner, { files: [CLAUDE] });
			const guarded: Array<[AnyHandler, Parameters<typeof call>[1]]> = [
				[
					CREATE as AnyHandler,
					{ method: 'POST', path: '/api/v1/setups', params: {}, body: { slug: 'x', files: [] } }
				],
				[
					PATCH_BY_ID as AnyHandler,
					{ method: 'PATCH', path: '/x', params: { id: setup.id }, body: { baseRevision: 1 } }
				],
				[
					PATCH_BY_OWNER_SLUG as AnyHandler,
					{
						method: 'PATCH',
						path: '/x',
						params: { owner: owner.username, slug: setup.slug },
						body: { baseRevision: 1 }
					}
				],
				[MATCH as AnyHandler, { method: 'POST', path: '/x', params: {}, body: { files: [] } }],
				[
					CLONE as AnyHandler,
					{ method: 'POST', path: '/x', params: { owner: owner.username, slug: setup.slug } }
				]
			];
			for (const [handler, opts] of guarded) {
				const res = await call(handler, { ...opts, user: owner, cli: '0.9.9' });
				expect(res.status, opts.path).toBe(426);
			}
			const get = await call(GET_SETUP as AnyHandler, {
				user: owner,
				path: `/api/v1/setups/${owner.username}/${setup.slug}`,
				params: { owner: owner.username, slug: setup.slug },
				cli: null
			});
			expect(get.status).toBe(200);
		});
	});

	describe('Setup GET', () => {
		it('adds revision, revisionPublishedAt, prerequisites, postInstall and tag names', async () => {
			const owner = await user();
			const tag = uniq('read-tag');
			tagNames.push(tag);
			const setup = await create(owner, {
				files: [CLAUDE],
				tags: [tag],
				prerequisites: ['node 20'],
				postInstall: ['npm i']
			});
			await publish(owner, setup.id, { baseRevision: 1, files: [{ ...CLAUDE, content: 'v2' }] });

			const res = await call(GET_SETUP as AnyHandler, {
				path: `/api/v1/setups/${owner.username}/${setup.slug}`,
				params: { owner: owner.username, slug: setup.slug }
			});
			expect(res.status).toBe(200);
			expect(res.body.data).toMatchObject({
				id: setup.id,
				revision: 2,
				prerequisites: ['node 20'],
				postInstall: ['npm i'],
				tags: [tag]
			});
			expect(new Date(res.body.data.revisionPublishedAt).getTime()).not.toBeNaN();
		});
	});

	describe('match', () => {
		function match(as: User, body: unknown) {
			return call(MATCH as AnyHandler, {
				user: as,
				method: 'POST',
				path: '/api/v1/setups/match',
				params: {},
				body
			});
		}

		it('matches a fingerprint from a past Revision and from a teammate’s Team Setup', async () => {
			const alice = await user();
			const bob = await user();
			const stranger = await user();
			const team = await createTeam(bob.id, { name: 'Acme', slug: uniq('acme') });
			await db.insert(teamMembers).values({ teamId: team.id, userId: alice.id, role: 'member' });

			// Alice's personal Setup: FP_A in Revision 1, FP_B in Revision 2.
			const personal = await create(alice, { files: [CLAUDE], fingerprint: FP_A });
			await publish(alice, personal.id, { baseRevision: 1, fingerprint: FP_B, files: [CLAUDE] });
			// Bob's Team Setup with FP_A, and a stranger's Setup with FP_A that Alice can't use.
			const teamSetup = await create(bob, { files: [CLAUDE], fingerprint: FP_A, teamId: team.id });
			await create(stranger, { files: [CLAUDE], fingerprint: FP_A });

			const res = await match(alice, { fingerprint: FP_A, files: [] });
			expect(res.status).toBe(200);
			const ids = res.body.data.fingerprintMatches.map((s: { id: string }) => s.id).sort();
			expect(ids).toEqual([personal.id, teamSetup.id].sort());
			expect(res.body.data.overlap).toEqual([]);
			const teamSummary = res.body.data.fingerprintMatches.find(
				(s: { id: string }) => s.id === teamSetup.id
			);
			expect(teamSummary.path).toBe(`org/${team.slug}/${teamSetup.slug}`);

			const none = await match(alice, { fingerprint: FP_C, files: [] });
			expect(none.body.data).toEqual({ fingerprintMatches: [], overlap: [] });
		});

		it('falls back to path/hash overlap against the latest Revision, best first', async () => {
			const alice = await user();
			const other = await user();
			const big = await create(alice, { files: [CLAUDE, AGENTS, CMD] });
			const small = await create(alice, { files: [CLAUDE, AGENTS] });
			const stale = await create(alice, { files: [CLAUDE] });
			// stale's latest Revision no longer has CLAUDE.md's original hash.
			await publish(alice, stale.id, { baseRevision: 1, files: [{ ...CLAUDE, content: 'v2' }] });
			await create(alice, { files: [CMD] }); // shares nothing below
			await create(other, { files: [CLAUDE, AGENTS] }); // not Alice's

			const local = await Promise.all(
				[CLAUDE, AGENTS].map(async (f) => ({
					path: f.path,
					hash: await hashSetupFile(f.path, f.content)
				}))
			);
			const res = await match(alice, { fingerprint: FP_C, files: local });
			expect(res.status).toBe(200);
			expect(res.body.data.fingerprintMatches).toEqual([]);
			expect(
				res.body.data.overlap.map((o: { id: string; matched: number; total: number }) => [
					o.id,
					o.matched,
					o.total
				])
			).toEqual([
				[small.id, 2, 2],
				[big.id, 2, 3]
			]);
			expect(res.body.data.overlap[0].path).toBe(`${alice.username}/${small.slug}`);
		});
	});

	describe('clone', () => {
		it('counts a re-clone by the same user once, with Activity only the first time', async () => {
			const owner = await user();
			const cloner = await user();
			const setup = await create(owner, { files: [CLAUDE] });

			const first = await clone(owner, setup.slug, cloner);
			expect(first.status).toBe(200);
			expect(first.body.data).toEqual({ firstClone: true, clonesCount: 1 });
			const again = await clone(owner, setup.slug, cloner);
			expect(again.body.data).toEqual({ firstClone: false, clonesCount: 1 });

			const acts = await db
				.select()
				.from(activities)
				.where(and(eq(activities.setupId, setup.id), eq(activities.actionType, 'cloned_setup')));
			expect(acts.map((a) => a.userId)).toEqual([cloner.id]);

			const [row] = await db
				.select()
				.from(setupClones)
				.where(and(eq(setupClones.setupId, setup.id), eq(setupClones.userId, cloner.id)));
			expect(row.lastClonedAt.getTime()).toBeGreaterThanOrEqual(row.firstClonedAt.getTime());
		});

		it('counts the same anonymous IP once per day, with no Activity', async () => {
			const owner = await user();
			const setup = await create(owner, { files: [CLAUDE] });

			expect((await clone(owner, setup.slug, null, '198.51.100.1')).body.data).toEqual({
				firstClone: true,
				clonesCount: 1
			});
			expect((await clone(owner, setup.slug, null, '198.51.100.1')).body.data).toEqual({
				firstClone: false,
				clonesCount: 1
			});
			expect((await clone(owner, setup.slug, null, '198.51.100.2')).body.data).toEqual({
				firstClone: true,
				clonesCount: 2
			});

			const rows = await db.select().from(setupClones).where(eq(setupClones.setupId, setup.id));
			expect(rows.map((r) => r.anonKey).sort()).toEqual(
				(
					await Promise.all(
						['198.51.100.1', '198.51.100.2'].map((ip) => anonCloneKey('test-clone-salt', ip))
					)
				).sort()
			);
			const acts = await db
				.select()
				.from(activities)
				.where(and(eq(activities.setupId, setup.id), eq(activities.actionType, 'cloned_setup')));
			expect(acts).toHaveLength(0);
		});

		it('does not let an anonymous caller clone a private Setup', async () => {
			const owner = await user();
			const setup = await create(owner, { files: [CLAUDE], visibility: 'private' });
			expect((await clone(owner, setup.slug, null)).status).toBe(404);
			expect((await clone(owner, setup.slug, owner)).status).toBe(200);
		});
	});

	describe('redirects', () => {
		it('resolves a renamed personal slug on every endpoint', async () => {
			const owner = await user();
			const setup = await create(owner, { files: [CLAUDE] });
			const oldSlug = setup.slug;
			const newSlug = uniq('renamed');
			await updateSetupByIdWithSlugRedirects(
				setup.id,
				{ slug: newSlug },
				{ userId: owner.id, teamId: null, currentSlug: oldSlug }
			);
			const params = { owner: owner.username, slug: oldSlug };
			const base = `/api/v1/setups/${owner.username}`;

			const get = await call(GET_SETUP as AnyHandler, { path: `${base}/${oldSlug}`, params });
			expect(get.status).toBe(301);
			expect(get.location).toBe(`${base}/${newSlug}`);

			const f = await call(GET_FILES as AnyHandler, {
				path: `${base}/${oldSlug}/files?x=1`,
				params
			});
			expect(f.status).toBe(301);
			expect(f.location).toBe(`${base}/${newSlug}/files?x=1`);

			const c = await clone(owner, oldSlug, null);
			expect(c.status).toBe(200);
			expect(c.body.data.firstClone).toBe(true);

			const p = await call(PATCH_BY_OWNER_SLUG as AnyHandler, {
				user: owner,
				method: 'PATCH',
				path: `${base}/${oldSlug}`,
				params,
				body: { baseRevision: 1, description: 'via old slug' }
			});
			expect(p.status).toBe(200);
			expect(p.body.data.setup.slug).toBe(newSlug);
		});

		it('resolves a renamed Team slug on every Team endpoint, keyed by the Team', async () => {
			const alice = await user();
			const team = await createTeam(alice.id, { name: 'Acme', slug: uniq('acme') });
			const setup = await create(alice, { files: [CLAUDE], teamId: team.id });
			const oldSlug = setup.slug;
			const newSlug = uniq('renamed');
			await updateSetupByIdWithSlugRedirects(
				setup.id,
				{ slug: newSlug },
				{ userId: alice.id, teamId: team.id, currentSlug: oldSlug }
			);
			const params = { slug: team.slug, setupSlug: oldSlug };
			const base = `/api/v1/teams/${team.slug}/setups`;

			const get = await call(GET_TEAM_SETUP as AnyHandler, {
				user: alice,
				path: `${base}/${oldSlug}`,
				params
			});
			expect(get.status).toBe(301);
			expect(get.location).toBe(`${base}/${newSlug}`);

			const f = await call(GET_TEAM_FILES as AnyHandler, {
				user: alice,
				path: `${base}/${oldSlug}/files`,
				params
			});
			expect(f.status).toBe(301);
			expect(f.location).toBe(`${base}/${newSlug}/files`);

			const c = await call(CLONE_TEAM as AnyHandler, {
				user: alice,
				method: 'POST',
				path: `${base}/${oldSlug}/clone`,
				params
			});
			expect(c.status).toBe(200);
			expect(c.body.data).toEqual({ firstClone: true, clonesCount: 1 });

			// The private Team Setup's redirect isn't followed for an outsider.
			const outsider = await user();
			const hidden = await call(GET_TEAM_FILES as AnyHandler, {
				user: outsider,
				path: `${base}/${oldSlug}/files`,
				params
			});
			expect(hidden.status).toBe(404);

			// Current slug: Team GET carries the read extras.
			const current = await call(GET_TEAM_SETUP as AnyHandler, {
				user: alice,
				path: `${base}/${newSlug}`,
				params: { slug: team.slug, setupSlug: newSlug }
			});
			expect(current.body.data).toMatchObject({ id: setup.id, revision: 1, tags: [] });
		});
	});

	describe('personal vs Team lookup', () => {
		it('resolves the personal route to the personal `x` when the user also has a Team `x`', async () => {
			const alice = await user();
			const team = await createTeam(alice.id, { name: 'Acme', slug: uniq('acme') });
			const slug = uniq('x');
			const teamSetup = await create(alice, { slug, files: [CLAUDE], teamId: team.id });
			const personal = await create(alice, { slug, files: [CLAUDE] });
			expect(teamSetup.id).not.toBe(personal.id);

			for (let i = 0; i < 3; i++) {
				const res = await call(GET_SETUP as AnyHandler, {
					user: alice,
					path: `/api/v1/setups/${alice.username}/${slug}`,
					params: { owner: alice.username, slug }
				});
				expect(res.body.data.id).toBe(personal.id);
			}
		});

		it('does not serve a Team Setup on the personal route', async () => {
			const alice = await user();
			const team = await createTeam(alice.id, { name: 'Acme', slug: uniq('acme') });
			const teamSetup = await create(alice, { files: [CLAUDE], teamId: team.id });
			const res = await call(GET_SETUP as AnyHandler, {
				user: alice,
				path: `/api/v1/setups/${alice.username}/${teamSetup.slug}`,
				params: { owner: alice.username, slug: teamSetup.slug }
			});
			expect(res.status).toBe(404);
		});
	});
});
