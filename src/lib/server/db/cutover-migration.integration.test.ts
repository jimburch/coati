/**
 * The manifest-less cutover migration (#405, spec #402 §1–§2).
 *
 * Runs against throwaway databases: one put in the pre-cutover shape and
 * filled with old-shape rows, and one empty. Never touches the shared test DB.
 */

import { describe, it, expect } from 'vitest';
import {
	createScratchDatabase,
	hasTestDatabase,
	migrateDatabase
} from './__tests__/scratch-database';

const PRE_CUTOVER = '0019_activities_setup_id_idx';

const KEPT_TABLES = [
	'users',
	'teams',
	'team_members',
	'follows',
	'sessions',
	'device_flow_states'
] as const;

const WIPED_TABLES = [
	'setups',
	'setup_files',
	'setup_tags',
	'setup_agents',
	'stars',
	'comments',
	'setup_shares',
	'setup_reports',
	'setup_slug_redirects',
	'tags',
	'setup_revisions',
	'setup_revision_files',
	'setup_clones'
] as const;

describe.skipIf(!hasTestDatabase)('cutover migration', () => {
	it('wipes Setups and keeps people on a database holding old-shape data', async () => {
		const scratch = await createScratchDatabase('coati_mig_old');
		const { sql } = scratch;
		try {
			await migrateDatabase(scratch.url, { upTo: PRE_CUTOVER });

			const [alice] = await sql`
				INSERT INTO users (github_id, username, email, avatar_url, github_username, setups_count, followers_count)
				VALUES (1001, 'alice', 'a@example.test', 'https://a.test/a.png', 'alice', 2, 1)
				RETURNING id`;
			const [bob] = await sql`
				INSERT INTO users (github_id, username, email, avatar_url, github_username, following_count)
				VALUES (1002, 'bob', 'b@example.test', 'https://a.test/b.png', 'bob', 1)
				RETURNING id`;
			const [team] = await sql`
				INSERT INTO teams (name, slug, owner_id, members_count)
				VALUES ('Acme', 'acme', ${alice.id}, 2) RETURNING id`;
			await sql`INSERT INTO team_members (team_id, user_id, role) VALUES
				(${team.id}, ${alice.id}, 'admin'), (${team.id}, ${bob.id}, 'member')`;
			await sql`INSERT INTO follows (follower_id, following_id) VALUES (${bob.id}, ${alice.id})`;
			await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES ('sess-1', ${alice.id}, now() + interval '1 day')`;
			await sql`
				INSERT INTO device_flow_states (device_code, user_code, github_device_code, expires_at, user_id)
				VALUES ('dc', 'uc', 'gdc', now() + interval '1 hour', ${bob.id})`;

			const [tag] = await sql`INSERT INTO tags (name) VALUES ('typescript') RETURNING id`;
			const [agent] = await sql`SELECT id FROM agents WHERE slug = 'claude-code'`;
			const [personal] = await sql`
				INSERT INTO setups (user_id, name, slug, description, min_tool_version, display, clones_count)
				VALUES (${alice.id}, 'my-setup', 'my-setup', 'Old shape', '1.0.0', 'My Setup', 7)
				RETURNING id`;
			const [teamSetup] = await sql`
				INSERT INTO setups (user_id, name, slug, description, team_id, visibility)
				VALUES (${alice.id}, 'team-setup', 'team-setup', 'Team one', ${team.id}, 'private')
				RETURNING id`;
			await sql`INSERT INTO setup_files (setup_id, path, content, agent) VALUES
				(${personal.id}, 'CLAUDE.md', '# hi', 'claude-code'),
				(${teamSetup.id}, 'AGENTS.md', '# team', NULL)`;
			await sql`INSERT INTO setup_tags (setup_id, tag_id) VALUES (${personal.id}, ${tag.id})`;
			await sql`INSERT INTO setup_agents (setup_id, agent_id) VALUES (${personal.id}, ${agent.id})`;
			await sql`INSERT INTO stars (user_id, setup_id) VALUES (${bob.id}, ${personal.id})`;
			const [comment] = await sql`
				INSERT INTO comments (setup_id, user_id, body) VALUES (${personal.id}, ${bob.id}, 'nice')
				RETURNING id`;
			await sql`INSERT INTO setup_shares (setup_id, shared_with_user_id) VALUES (${personal.id}, ${bob.id})`;
			await sql`INSERT INTO setup_reports (setup_id, reporter_id, reason) VALUES (${personal.id}, ${bob.id}, 'spam')`;
			await sql`INSERT INTO setup_slug_redirects (user_id, old_slug, setup_id) VALUES (${alice.id}, 'old-slug', ${personal.id})`;
			await sql`INSERT INTO activities (user_id, setup_id, action_type) VALUES
				(${alice.id}, ${personal.id}, 'created_setup'),
				(${bob.id}, ${personal.id}, 'cloned_setup')`;
			await sql`INSERT INTO activities (user_id, setup_id, comment_id, action_type) VALUES
				(${bob.id}, ${personal.id}, ${comment.id}, 'commented')`;
			// An orphan left behind by an earlier setup delete (FK is `set null`).
			await sql`INSERT INTO activities (user_id, action_type) VALUES (${bob.id}, 'starred_setup')`;
			await sql`INSERT INTO activities (user_id, target_user_id, action_type) VALUES (${bob.id}, ${alice.id}, 'followed_user')`;
			await sql`INSERT INTO activities (user_id, team_id, action_type) VALUES (${alice.id}, ${team.id}, 'created_team')`;
			await sql`REFRESH MATERIALIZED VIEW trending_setups_mv`;

			const before: Record<string, unknown[]> = {};
			for (const table of KEPT_TABLES) {
				before[table] = [...(await sql`SELECT * FROM ${sql(table)} ORDER BY 1`)];
			}

			await migrateDatabase(scratch.url);

			for (const table of KEPT_TABLES) {
				const after = await sql`SELECT * FROM ${sql(table)} ORDER BY 1`;
				if (table === 'users') {
					expect(after.map((u) => u.setups_count)).toEqual([0, 0]);
					const strip = (rows: unknown[]) =>
						rows.map((r) => ({ ...(r as object), setups_count: undefined }));
					expect(strip(after)).toEqual(strip(before.users));
				} else {
					expect(after, table).toEqual(before[table]);
				}
			}

			for (const table of WIPED_TABLES) {
				const [{ count }] = await sql`SELECT count(*)::int AS count FROM ${sql(table)}`;
				expect(count, table).toBe(0);
			}

			const activityTypes =
				await sql`SELECT action_type FROM activities ORDER BY action_type::text`;
			expect(activityTypes.map((a) => a.action_type)).toEqual(['created_team', 'followed_user']);

			const [{ count: trending }] =
				await sql`SELECT count(*)::int AS count FROM trending_setups_mv`;
			expect(trending).toBe(0);

			const setupColumns = await sql`
				SELECT column_name FROM information_schema.columns WHERE table_name = 'setups'`;
			const names = setupColumns.map((c) => c.column_name);
			expect(names).not.toContain('name');
			expect(names).not.toContain('min_tool_version');

			const [antigravity] = await sql`
				SELECT display_name, icon, official FROM agents WHERE slug = 'antigravity'`;
			expect(antigravity).toEqual({
				display_name: 'Antigravity',
				icon: 'antigravity.svg',
				official: true
			});
		} finally {
			await scratch.drop();
		}
	});

	it('runs on an empty database', async () => {
		const scratch = await createScratchDatabase('coati_mig_empty');
		const { sql } = scratch;
		try {
			await migrateDatabase(scratch.url);

			for (const table of WIPED_TABLES) {
				const [{ count }] = await sql`SELECT count(*)::int AS count FROM ${sql(table)}`;
				expect(count, table).toBe(0);
			}
			const agents = await sql`SELECT slug FROM agents ORDER BY slug`;
			expect(agents.map((a) => a.slug)).toEqual([
				'antigravity',
				'claude-code',
				'codex',
				'copilot',
				'cursor',
				'gemini',
				'opencode'
			]);
		} finally {
			await scratch.drop();
		}
	});
});
