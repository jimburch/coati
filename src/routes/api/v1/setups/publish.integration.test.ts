/**
 * Server publish (#406, spec §5): `POST /api/v1/setups` and both PATCH routes,
 * end to end through the route handlers against the real test database.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL: process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL,
		GITHUB_CLIENT_ID: 'test',
		GITHUB_CLIENT_SECRET: 'test'
	}
}));

import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	activities,
	agents,
	setupAgents,
	setupFiles,
	setupRevisionFiles,
	setupRevisions,
	setups,
	tags,
	teamMembers,
	users
} from '$lib/server/db/schema';
import { hashSetupFile } from '@coati/content-hash';
import { createTeam } from '$lib/server/queries/teams';
import { getSetupTagNames } from '$lib/server/queries/publish';
import { createTestUser, deleteTestUsers } from '$lib/server/queries/__tests__/db-test-helpers';
import type { User } from '$lib/types';
import { POST } from './+server';
import { PATCH as PATCH_BY_ID } from './[id]/+server';
import { PATCH as PATCH_BY_OWNER_SLUG } from './[owner]/[slug]/+server';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

const FP_A = 'a'.repeat(64);
const FP_B = 'b'.repeat(64);

function uniq(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

type Event = Parameters<typeof POST>[0];

function makeEvent(
	user: User | null,
	method: 'POST' | 'PATCH',
	body: unknown,
	params: Record<string, string> = {}
): Event {
	const url = new URL('http://localhost/api/v1/setups');
	return {
		locals: { user },
		params,
		url,
		request: new Request(url, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as unknown as Event;
}

async function create(user: User, body: Record<string, unknown>) {
	const res = await POST(makeEvent(user, 'POST', body));
	return { status: res.status, body: await res.json() };
}

async function patch(user: User, id: string, body: Record<string, unknown>) {
	const res = await PATCH_BY_ID(makeEvent(user, 'PATCH', body, { id }) as never);
	return { status: res.status, body: await res.json() };
}

async function revisionsOf(setupId: string) {
	const revs = await db
		.select()
		.from(setupRevisions)
		.where(eq(setupRevisions.setupId, setupId))
		.orderBy(asc(setupRevisions.number));
	return Promise.all(
		revs.map(async (r) => ({
			number: r.number,
			fingerprint: r.repoFingerprint,
			publishedBy: r.publishedBy,
			files: Object.fromEntries(
				(
					await db
						.select({ path: setupRevisionFiles.path, hash: setupRevisionFiles.hash })
						.from(setupRevisionFiles)
						.where(eq(setupRevisionFiles.revisionId, r.id))
				).map((f) => [f.path, f.hash])
			)
		}))
	);
}

async function filesOf(setupId: string) {
	const rows = await db.select().from(setupFiles).where(eq(setupFiles.setupId, setupId));
	return Object.fromEntries(rows.map((f) => [f.path, f]));
}

async function agentSlugsOf(setupId: string) {
	const rows = await db
		.select({ slug: agents.slug })
		.from(setupAgents)
		.innerJoin(agents, eq(setupAgents.agentId, agents.id))
		.where(eq(setupAgents.setupId, setupId));
	return rows.map((r) => r.slug).sort();
}

const CLAUDE = { path: 'CLAUDE.md', content: '# rules\n' };
const AGENTS = { path: 'AGENTS.md', content: '# agents\n' };
const MCP = {
	path: '.mcp.json#mcpServers.github',
	content: '{\n  "command": "npx",\n  "args": ["-y", "gh"]\n}',
	agent: 'copilot'
};

describe.skipIf(!hasDatabase)('Server publish — integration', () => {
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

	async function createBasic(owner: User, extra: Record<string, unknown> = {}) {
		const res = await create(owner, {
			slug: uniq('pub'),
			fingerprint: FP_A,
			files: [CLAUDE, AGENTS, MCP],
			...extra
		});
		expect(res.status).toBe(201);
		return res.body.data as {
			setup: { id: string; slug: string; path: string; url: string };
			revision: number;
		};
	}

	describe('create', () => {
		it('creates Revision 1 with the full set, hashes, tags, agents and Activity', async () => {
			const owner = await user();
			const tagA = uniq('Web Dev');
			const res = await create(owner, {
				slug: uniq('create'),
				description: 'My setup',
				tags: [tagA, tagA.toUpperCase()],
				fingerprint: FP_A,
				files: [CLAUDE, AGENTS, MCP]
			});
			const normalized = tagA.toLowerCase().replace(/ /g, '-');
			tagNames.push(normalized);

			expect(res.status).toBe(201);
			const data = res.body.data;
			expect(data).toMatchObject({
				revision: 1,
				revisionCreated: true,
				changes: { added: [CLAUDE.path, AGENTS.path, MCP.path], updated: [], removed: [] },
				metadataUpdated: []
			});
			expect(data.setup).toMatchObject({
				path: `${owner.username}/${data.setup.slug}`,
				url: `http://localhost/${owner.username}/${data.setup.slug}`,
				teamSlug: null,
				ownerUsername: owner.username,
				display: null,
				visibility: 'public'
			});

			const id = data.setup.id;
			const expected = {
				[CLAUDE.path]: await hashSetupFile(CLAUDE.path, CLAUDE.content),
				[AGENTS.path]: await hashSetupFile(AGENTS.path, AGENTS.content),
				[MCP.path]: await hashSetupFile(MCP.path, MCP.content)
			};
			expect(await revisionsOf(id)).toEqual([
				{ number: 1, fingerprint: FP_A, publishedBy: owner.id, files: expected }
			]);

			const files = await filesOf(id);
			expect(files[CLAUDE.path]).toMatchObject({
				agent: 'claude-code',
				componentType: 'instruction'
			});
			// Shared glob with no Agent sent: none.
			expect(files[AGENTS.path].agent).toBeNull();
			expect(files[MCP.path]).toMatchObject({ agent: 'copilot', componentType: 'mcp_server' });

			expect(await agentSlugsOf(id)).toEqual(['claude-code', 'copilot']);
			expect(await getSetupTagNames(db, id)).toEqual([normalized]);

			const [act] = await db
				.select()
				.from(activities)
				.where(and(eq(activities.setupId, id), eq(activities.actionType, 'created_setup')));
			expect(act.userId).toBe(owner.id);
			const [row] = await db
				.select({ n: users.setupsCount })
				.from(users)
				.where(eq(users.id, owner.id));
			expect(row.n).toBe(1);
		});

		it('ignores the hash the client sends', async () => {
			const owner = await user();
			const res = await create(owner, {
				slug: uniq('hash'),
				files: [{ ...CLAUDE, hash: '0'.repeat(64) }]
			});
			expect(res.status).toBe(201);
			const files = await filesOf(res.body.data.setup.id);
			expect(files[CLAUDE.path].hash).toBe(await hashSetupFile(CLAUDE.path, CLAUDE.content));
		});

		it('rejects more than 10 tags after normalizing', async () => {
			const owner = await user();
			const res = await create(owner, {
				slug: uniq('tags'),
				tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
				files: [CLAUDE]
			});
			expect(res.status).toBe(400);
			expect(res.body.code).toBe('VALIDATION_ERROR');
		});

		it('returns 409 SLUG_TAKEN for a slug the owner already has', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			const res = await create(owner, { slug: setup.slug, files: [CLAUDE] });
			expect(res.status).toBe(409);
			expect(res.body.code).toBe('SLUG_TAKEN');
		});

		it('creates a Team Setup private, with an org path', async () => {
			const alice = await user();
			const team = await createTeam(alice.id, { name: 'Acme', slug: uniq('acme') });
			const res = await create(alice, {
				slug: uniq('team'),
				teamId: team.id,
				visibility: 'public',
				files: [CLAUDE]
			});
			expect(res.status).toBe(201);
			expect(res.body.data.setup).toMatchObject({
				visibility: 'private',
				teamSlug: team.slug,
				path: `org/${team.slug}/${res.body.data.setup.slug}`
			});
		});
	});

	describe('validation', () => {
		const cases: Array<[string, { path: string; content: string }, string]> = [
			[
				'the whole .claude/settings.json',
				{ path: '.claude/settings.json', content: '{}' },
				'SETTINGS_FILE_WHOLE'
			],
			[
				'.claude/settings.json#apiKeyHelper',
				{ path: '.claude/settings.json#apiKeyHelper', content: '"x"' },
				'INVALID_SELECTOR'
			],
			['~/.bashrc', { path: '~/.bashrc', content: 'echo hi' }, 'INVALID_PATH'],
			['~/.claude.json', { path: '~/.claude.json', content: '{}' }, 'INVALID_SELECTOR'],
			['a .git segment', { path: 'sub/.git/config', content: 'x' }, 'INVALID_PATH'],
			[
				'fragment content that is not JSON',
				{ path: '.mcp.json#mcpServers.github', content: 'not json' },
				'VALIDATION_ERROR'
			]
		];

		it.each(cases)('rejects %s on create and writes nothing', async (_, file, code) => {
			const owner = await user();
			const slug = uniq('bad');
			const res = await create(owner, { slug, files: [CLAUDE, file] });
			expect(res.status).toBe(400);
			expect(res.body.code).toBe(code);
			const rows = await db.select().from(setups).where(eq(setups.slug, slug));
			expect(rows).toHaveLength(0);
		});

		it('rejects an Agent the path is not allowed on a new path', async () => {
			const owner = await user();
			const res = await create(owner, {
				slug: uniq('cls'),
				files: [{ ...CLAUDE, agent: 'cursor' }]
			});
			expect(res.status).toBe(400);
			expect(res.body.code).toBe('INVALID_CLASSIFICATION');
		});

		it('rejects a bad path on update with INVALID_PATH', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			const res = await patch(owner, setup.id, {
				baseRevision: 1,
				files: [CLAUDE, { path: '~/.ssh/authorized_keys', content: 'ssh-rsa x' }]
			});
			expect(res.status).toBe(400);
			expect(res.body.code).toBe('INVALID_PATH');
		});
	});

	describe('update', () => {
		it('creates Revision 2 when files change, applying the diff by path', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			const changedClaude = { ...CLAUDE, content: '# rules v2\n' };
			const added = { path: '.claude/commands/ship.md', content: 'ship it' };

			const res = await patch(owner, setup.id, {
				baseRevision: 1,
				fingerprint: FP_A,
				files: [changedClaude, MCP, added]
			});
			expect(res.status).toBe(200);
			expect(res.body.data).toMatchObject({
				revision: 2,
				revisionCreated: true,
				changes: { added: [added.path], updated: [CLAUDE.path], removed: [AGENTS.path] },
				metadataUpdated: []
			});
			expect(res.body.data.setup.id).toBe(setup.id);

			const revs = await revisionsOf(setup.id);
			expect(revs.map((r) => r.number)).toEqual([1, 2]);
			// Each Revision holds its full path set.
			expect(Object.keys(revs[0].files).sort()).toEqual(
				[CLAUDE.path, AGENTS.path, MCP.path].sort()
			);
			expect(revs[1].files).toEqual({
				[CLAUDE.path]: await hashSetupFile(CLAUDE.path, changedClaude.content),
				[MCP.path]: await hashSetupFile(MCP.path, MCP.content),
				[added.path]: await hashSetupFile(added.path, added.content)
			});

			const files = await filesOf(setup.id);
			expect(Object.keys(files).sort()).toEqual([CLAUDE.path, MCP.path, added.path].sort());
			expect(files[CLAUDE.path].content).toBe(changedClaude.content);
			expect(files[added.path]).toMatchObject({ agent: 'claude-code', componentType: 'command' });
		});

		it('creates a Revision for identical files from a new fingerprint', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			const res = await patch(owner, setup.id, {
				baseRevision: 1,
				fingerprint: FP_B,
				files: [CLAUDE, AGENTS, MCP]
			});
			expect(res.body.data).toMatchObject({
				revision: 2,
				revisionCreated: true,
				changes: { added: [], updated: [], removed: [] }
			});
			const revs = await revisionsOf(setup.id);
			expect(revs[1].fingerprint).toBe(FP_B);
			expect(revs[1].files).toEqual(revs[0].files);
		});

		it('creates no Revision for identical files from a known fingerprint or none', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			for (const fingerprint of [FP_A, undefined]) {
				const res = await patch(owner, setup.id, {
					baseRevision: 1,
					fingerprint,
					files: [MCP, AGENTS, CLAUDE]
				});
				expect(res.status).toBe(200);
				expect(res.body.data).toMatchObject({ revision: 1, revisionCreated: false });
			}
			// A line-ending-only difference hashes the same, so it isn't a change either.
			const crlf = await patch(owner, setup.id, {
				baseRevision: 1,
				files: [{ ...CLAUDE, content: '# rules\r\n' }, AGENTS, MCP]
			});
			expect(crlf.body.data.revisionCreated).toBe(false);
			expect(await revisionsOf(setup.id)).toHaveLength(1);
		});

		it('updates metadata without a Revision and reports what changed', async () => {
			const owner = await user();
			const tag = uniq('meta');
			tagNames.push(tag);
			const { setup } = await createBasic(owner, { description: 'old' });
			const res = await patch(owner, setup.id, {
				baseRevision: 1,
				description: 'new',
				display: null,
				tags: [tag],
				prerequisites: ['node']
			});
			expect(res.status).toBe(200);
			expect(res.body.data).toMatchObject({ revision: 1, revisionCreated: false });
			expect(res.body.data.metadataUpdated.sort()).toEqual(
				['description', 'prerequisites', 'tags'].sort()
			);
			expect(res.body.data.setup.description).toBe('new');
			expect(await revisionsOf(setup.id)).toHaveLength(1);

			const again = await patch(owner, setup.id, {
				baseRevision: 1,
				description: 'new',
				tags: [tag]
			});
			expect(again.body.data.metadataUpdated).toEqual([]);
		});

		it('returns 409 REVISION_CONFLICT with latestRevision for a stale baseRevision', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			await patch(owner, setup.id, {
				baseRevision: 1,
				files: [{ ...CLAUDE, content: 'v2' }, AGENTS, MCP]
			});
			const res = await patch(owner, setup.id, {
				baseRevision: 1,
				files: [{ ...CLAUDE, content: 'v3' }, AGENTS, MCP]
			});
			expect(res.status).toBe(409);
			expect(res.body).toMatchObject({
				data: null,
				code: 'REVISION_CONFLICT',
				latestRevision: 2
			});
			expect((await filesOf(setup.id))[CLAUDE.path].content).toBe('v2');
		});

		it('ignores Classification sent for existing paths, and re-detects a re-added path', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			await patch(owner, setup.id, {
				baseRevision: 1,
				files: [
					{ ...CLAUDE, content: 'changed', componentType: 'config', description: 'nope' },
					AGENTS,
					MCP
				]
			});
			expect((await filesOf(setup.id))[CLAUDE.path]).toMatchObject({
				agent: 'claude-code',
				componentType: 'instruction',
				description: null
			});

			// AGENTS.md: removed in Revision 3, added back in 4 with a new Classification.
			await patch(owner, setup.id, { baseRevision: 2, files: [CLAUDE, MCP] });
			await patch(owner, setup.id, {
				baseRevision: 3,
				files: [CLAUDE, MCP, { ...AGENTS, agent: 'codex' }]
			});
			expect((await filesOf(setup.id))[AGENTS.path].agent).toBe('codex');
		});

		it('recomputes setup_agents from the remaining files', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			expect(await agentSlugsOf(setup.id)).toEqual(['claude-code', 'copilot']);
			await patch(owner, setup.id, { baseRevision: 1, files: [CLAUDE] });
			expect(await agentSlugsOf(setup.id)).toEqual(['claude-code']);
		});

		it('ignores a slug in the body: renames are web-only', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			const res = await patch(owner, setup.id, { baseRevision: 1, slug: 'renamed' });
			expect(res.status).toBe(200);
			expect(res.body.data.setup.slug).toBe(setup.slug);
		});

		it('PATCH /setups/[owner]/[slug] runs the same handler', async () => {
			const owner = await user();
			const { setup } = await createBasic(owner);
			const res = await PATCH_BY_OWNER_SLUG(
				makeEvent(
					owner,
					'PATCH',
					{ baseRevision: 1, files: [CLAUDE] },
					{
						owner: owner.username,
						slug: setup.slug
					}
				) as never
			);
			const body = await res.json();
			expect(res.status).toBe(200);
			expect(body.data).toMatchObject({
				revision: 2,
				changes: { removed: [AGENTS.path, MCP.path] }
			});
		});
	});

	describe('permissions', () => {
		it('rejects a non-owner on a personal Setup', async () => {
			const owner = await user();
			const other = await user();
			const { setup } = await createBasic(owner);
			const res = await patch(other, setup.id, { baseRevision: 1, files: [CLAUDE] });
			expect(res.status).toBe(403);
			expect(res.body.code).toBe('FORBIDDEN');
		});

		it('lets a Team Member publish and edit metadata but not change visibility', async () => {
			const alice = await user();
			const bob = await user();
			const team = await createTeam(alice.id, { name: 'Acme', slug: uniq('acme') });
			await db.insert(teamMembers).values({ teamId: team.id, userId: bob.id, role: 'member' });
			const created = await create(alice, {
				slug: uniq('team'),
				teamId: team.id,
				files: [CLAUDE]
			});
			const id = created.body.data.setup.id;

			const publish = await patch(bob, id, {
				baseRevision: 1,
				description: 'bob was here',
				files: [CLAUDE, AGENTS]
			});
			expect(publish.status).toBe(200);
			expect(publish.body.data).toMatchObject({ revision: 2, metadataUpdated: ['description'] });
			expect((await revisionsOf(id))[1].publishedBy).toBe(bob.id);

			const vis = await patch(bob, id, { baseRevision: 2, visibility: 'public' });
			expect(vis.status).toBe(403);
			expect(vis.body.code).toBe('FORBIDDEN');

			// Sending the current visibility isn't a change.
			const same = await patch(bob, id, { baseRevision: 2, visibility: 'private' });
			expect(same.status).toBe(200);

			const admin = await patch(alice, id, { baseRevision: 2, visibility: 'public' });
			expect(admin.status).toBe(200);
			expect(admin.body.data.setup.visibility).toBe('public');
		});

		it('rejects someone outside the Team', async () => {
			const alice = await user();
			const eve = await user();
			const team = await createTeam(alice.id, { name: 'Acme', slug: uniq('acme') });
			const created = await create(alice, { slug: uniq('team'), teamId: team.id, files: [CLAUDE] });
			const res = await patch(eve, created.body.data.setup.id, {
				baseRevision: 1,
				files: [CLAUDE]
			});
			expect(res.status).toBe(403);
		});
	});
});
