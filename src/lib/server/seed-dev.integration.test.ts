/**
 * The dev seed against a real, freshly migrated database (#405, spec #402 §10).
 *
 * `seed()` truncates every table, so it runs in its own throwaway database.
 * GitHub is stubbed. Checks that the seeded data follows the manifest-less
 * model: Revisions with server-function hashes, paths the publish rules accept,
 * fragments, `~/` files, an Antigravity Setup, a Team Setup with a redirect,
 * clone rows and tags created by name.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { hashSetupFile, parseSetupPath } from '@coati/content-hash';
import {
	allowedAgentsFor,
	getOfferedSelector,
	getSettingsFile,
	isAllowedHomePath
} from '@coati/agents-registry';
import * as schema from '$lib/server/db/schema';
import { seed } from '../../../scripts/seed-dev';
import {
	createScratchDatabase,
	hasTestDatabase,
	migrateDatabase,
	type ScratchDatabase
} from './db/__tests__/scratch-database';

function stubGitHub(): typeof fetch {
	let id = 0;
	return (async (input: string | URL | Request) => {
		const login = String(input).split('/').pop() ?? 'user';
		id++;
		return new Response(
			JSON.stringify({
				login,
				id,
				avatar_url: `https://avatars.example.test/${id}`,
				name: null,
				bio: null,
				email: null,
				blog: null,
				location: null
			}),
			{ status: 200, headers: { 'content-type': 'application/json' } }
		);
	}) as typeof fetch;
}

type Row = Record<string, unknown>;

describe.skipIf(!hasTestDatabase)('seed() — integration', () => {
	let scratch: ScratchDatabase;
	let setupRows: Row[];
	let fileRows: Row[];
	let revisionRows: Row[];
	let revisionFileRows: Row[];

	beforeAll(async () => {
		scratch = await createScratchDatabase('coati_seed');
		await migrateDatabase(scratch.url);
		await seed(drizzle(scratch.sql, { schema }), { fetcher: stubGitHub(), delayMs: 0 });

		setupRows = [...(await scratch.sql`SELECT * FROM setups`)];
		fileRows = [...(await scratch.sql`SELECT * FROM setup_files`)];
		revisionRows = [...(await scratch.sql`SELECT * FROM setup_revisions`)];
		revisionFileRows = [...(await scratch.sql`SELECT * FROM setup_revision_files`)];
	}, 120_000);

	afterAll(async () => {
		await scratch?.drop();
	});

	function latestRevisionFiles(setupId: unknown): Map<string, string> {
		const revisions = revisionRows.filter((r) => r.setup_id === setupId);
		const latest = revisions.reduce((a, b) =>
			(a.number as number) > (b.number as number) ? a : b
		);
		return new Map(
			revisionFileRows
				.filter((f) => f.revision_id === latest.id)
				.map((f) => [f.path as string, f.hash as string])
		);
	}

	function pathsOf(setupId: unknown): string[] {
		return fileRows.filter((f) => f.setup_id === setupId).map((f) => f.path as string);
	}

	it('gives every Setup numbered Revisions whose latest set matches its files', async () => {
		expect(setupRows.length).toBeGreaterThan(20);
		for (const setup of setupRows) {
			const numbers = revisionRows
				.filter((r) => r.setup_id === setup.id)
				.map((r) => r.number as number)
				.sort((a, b) => a - b);
			expect(numbers, setup.slug as string).toEqual(numbers.map((_, i) => i + 1));

			const files = fileRows.filter((f) => f.setup_id === setup.id);
			expect(new Map(files.map((f) => [f.path as string, f.hash as string]))).toEqual(
				latestRevisionFiles(setup.id)
			);
		}
	});

	it('stores the server hash of every file', async () => {
		for (const file of fileRows) {
			expect(file.hash).toBe(await hashSetupFile(file.path as string, file.content as string));
		}
	});

	it('only stores paths and Classifications the publish rules accept', () => {
		for (const file of fileRows) {
			const path = file.path as string;
			const parsed = parseSetupPath(path);
			expect(parsed, path).not.toBeNull();
			if (parsed!.selector) {
				expect(getOfferedSelector(path), path).toBeDefined();
				expect(file.component_type, path).toBe(getOfferedSelector(path)!.componentType);
				expect(() => JSON.parse(file.content as string), path).not.toThrow();
			} else {
				expect(getSettingsFile(path), `${path} is a whole Settings file`).toBeUndefined();
			}
			if (parsed!.placement === 'global') expect(isAllowedHomePath(path), path).toBe(true);
			if (file.agent !== null) {
				expect(allowedAgentsFor(path), path).toContain(file.agent);
			}
		}
	});

	it('includes a Setup with three Revisions and a path removed along the way', () => {
		const removed = setupRows.find((setup) => {
			const revisions = revisionRows.filter((r) => r.setup_id === setup.id);
			if (revisions.length < 3) return false;
			const everPublished = new Set(
				revisionFileRows.filter((f) => f.setup_id === setup.id).map((f) => f.path)
			);
			const current = latestRevisionFiles(setup.id);
			return [...everPublished].some((p) => !current.has(p as string));
		});
		expect(removed).toBeDefined();
	});

	it('includes a mixed Setup with project and `~/` files', () => {
		const mixed = setupRows.find((s) => {
			const paths = pathsOf(s.id);
			return paths.some((p) => p.startsWith('~/')) && paths.some((p) => !p.startsWith('~/'));
		});
		expect(mixed).toBeDefined();
	});

	it('includes MCP, Claude hook and Codex TOML Settings fragments', () => {
		const paths = fileRows.map((f) => f.path as string);
		expect(paths.some((p) => p.startsWith('.mcp.json#mcpServers.'))).toBe(true);
		expect(
			paths.some((p) => /\.claude\/settings\.json#hooks\..+\[matcher=.*\]\.hooks\[command=/.test(p))
		).toBe(true);
		expect(paths.some((p) => /\.codex\/config\.toml#mcp_servers\./.test(p))).toBe(true);
	});

	it('includes an Antigravity Setup', async () => {
		const [{ count }] = await scratch.sql`
			SELECT count(*)::int AS count FROM setup_agents sa
			JOIN agents a ON a.id = sa.agent_id WHERE a.slug = 'antigravity'`;
		expect(count).toBeGreaterThan(0);
		expect(fileRows.some((f) => f.agent === 'antigravity')).toBe(true);
	});

	it('includes a Team Setup with a slug redirect keyed by its Team', async () => {
		const redirects = await scratch.sql`
			SELECT r.team_id, s.team_id AS setup_team_id FROM setup_slug_redirects r
			JOIN setups s ON s.id = r.setup_id WHERE r.team_id IS NOT NULL`;
		expect(redirects.length).toBeGreaterThan(0);
		for (const r of redirects) expect(r.team_id).toBe(r.setup_team_id);
	});

	it('records clones as user and anonymous rows, and counts them on the Setup', async () => {
		const clones = await scratch.sql`SELECT * FROM setup_clones`;
		expect(clones.some((c) => c.user_id !== null)).toBe(true);
		expect(clones.some((c) => c.anon_key !== null)).toBe(true);
		for (const setup of setupRows) {
			const count = clones.filter((c) => c.setup_id === setup.id).length;
			expect(setup.clones_count, setup.slug as string).toBe(count);
		}
	});

	it('creates tags by name only when a Setup uses them', async () => {
		const unused = await scratch.sql`
			SELECT name FROM tags WHERE id NOT IN (SELECT tag_id FROM setup_tags)`;
		expect(unused).toEqual([]);
		const tags = await scratch.sql`SELECT name FROM tags`;
		expect(tags.length).toBeGreaterThan(5);
		for (const t of tags) expect(t.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		const perSetup = await scratch.sql`
			SELECT max(n)::int AS max FROM (SELECT count(*) AS n FROM setup_tags GROUP BY setup_id) t`;
		expect(perSetup[0].max).toBeLessThanOrEqual(10);
	});

	it("keeps each user's Setup count in step with the Setups they created", async () => {
		const users = await scratch.sql`
			SELECT u.setups_count, (SELECT count(*)::int FROM setups s WHERE s.user_id = u.id) AS actual
			FROM users u`;
		for (const u of users) expect(u.setups_count).toBe(u.actual);
	});
});
