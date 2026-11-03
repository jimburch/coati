/**
 * Integration tests for setups query functions.
 *
 * Hits the real database — no mocks. Focus: createSetup/updateSetup/deleteSetup,
 * which write to 4+ tables in a transaction and touch user.setupsCount. Mocked
 * unit tests can't catch counter drift, partial writes, or cascade issues.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

// Must be declared before any module imports so that the hoisted mock is in
// place when $lib/server/db initialises its postgres connection.
vi.mock('$env/dynamic/private', () => ({
	env: {
		DATABASE_URL:
			process.env.DATABASE_URL_TEST ??
			process.env.DATABASE_URL ??
			'postgresql://coati:coati@localhost:5432/coati_dev',
		GITHUB_CLIENT_ID: 'test',
		GITHUB_CLIENT_SECRET: 'test'
	}
}));

import { createHash } from 'node:crypto';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	users,
	setups,
	setupFiles,
	setupAgents,
	setupTags,
	setupSlugRedirects,
	tags,
	teams,
	activities
} from '$lib/server/db/schema';
import {
	createSetup,
	deleteSetup,
	deleteSetupForce,
	getSetupByIdWithOwner,
	updateSetupByIdWithSlugRedirects,
	recordClone,
	searchSetups
} from './setups';
import {
	createTestUser,
	createTestAgent,
	deleteTestUsers,
	deleteTestAgents
} from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

async function createTestTag(name: string): Promise<{ id: string }> {
	const [row] = await db.insert(tags).values({ name }).returning();
	return row;
}

async function getSetupsCount(userId: string): Promise<number> {
	const [row] = await db
		.select({ count: users.setupsCount })
		.from(users)
		.where(eq(users.id, userId));
	return row.count;
}

describe.skipIf(!hasDatabase)('setups queries — integration', () => {
	const createdUserIds: string[] = [];
	const createdAgentIds: string[] = [];
	const createdTagIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
		await deleteTestAgents(createdAgentIds.splice(0));
		if (createdTagIds.length > 0) {
			await db.delete(tags).where(inArray(tags.id, createdTagIds.splice(0)));
		}
	});

	it('createSetup writes setup, files, agents (from file slugs), activity, and increments owner setupsCount', async () => {
		const owner = await createTestUser();
		const agent = await createTestAgent();
		const tag = await createTestTag(`tag-${Date.now()}`);
		createdUserIds.push(owner.id);
		createdAgentIds.push(agent.id);
		createdTagIds.push(tag.id);

		const initialCount = await getSetupsCount(owner.id);

		const created = await createSetup(owner.id, {
			slug: `created-${Date.now()}`,
			description: 'desc',
			files: [
				{ path: 'CLAUDE.md', componentType: 'instruction', content: '# hi', agent: agent.slug },
				{ path: 'README.md', componentType: 'instruction', content: '# readme' }
			]
		});
		await db.insert(setupTags).values({ setupId: created.id, tagId: tag.id });

		expect(created.id).toBeTruthy();

		// Files persisted
		const files = await db.select().from(setupFiles).where(eq(setupFiles.setupId, created.id));
		expect(files.map((f) => f.path).sort()).toEqual(['CLAUDE.md', 'README.md']);

		// Agents resolved from file slugs and joined
		const agentRows = await db
			.select()
			.from(setupAgents)
			.where(eq(setupAgents.setupId, created.id));
		expect(agentRows.map((r) => r.agentId)).toEqual([agent.id]);

		// Tags persisted
		const tagRows = await db.select().from(setupTags).where(eq(setupTags.setupId, created.id));
		expect(tagRows.map((r) => r.tagId)).toEqual([tag.id]);

		// Counter incremented
		expect(await getSetupsCount(owner.id)).toBe(initialCount + 1);

		// Activity row written
		const activityRows = await db
			.select()
			.from(activities)
			.where(and(eq(activities.userId, owner.id), eq(activities.setupId, created.id)));
		expect(activityRows).toHaveLength(1);
		expect(activityRows[0].actionType).toBe('created_setup');
	});

	it('createSetup stores the server-computed hash of every file', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		// Expected hashes come from node:crypto over the hash input the spec defines:
		// normalized text for whole files, RFC 8785 canonical JSON for fragments.
		const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

		const created = await createSetup(owner.id, {
			slug: `hashed-${Date.now()}`,
			description: 'desc',
			files: [
				{ path: 'CLAUDE.md', componentType: 'instruction', content: '\uFEFF# hi\r\n' },
				{
					path: '.mcp.json#mcpServers.github',
					componentType: 'mcp_server',
					content: '{\n  "command": "npx",\n  "args": ["-y", "gh"]\n}'
				}
			]
		});

		const hashesOf = async () =>
			Object.fromEntries(
				(
					await db
						.select({ path: setupFiles.path, hash: setupFiles.hash })
						.from(setupFiles)
						.where(eq(setupFiles.setupId, created.id))
				).map((f) => [f.path, f.hash])
			);

		expect(await hashesOf()).toEqual({
			'CLAUDE.md': sha256('# hi\n'),
			'.mcp.json#mcpServers.github': sha256('{"args":["-y","gh"],"command":"npx"}')
		});
	});

	it('searchSetups matches on slug, Display name and description', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);
		const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

		const bySlug = await createSetup(owner.id, {
			slug: `zebraslug${stamp}`,
			description: 'nothing to see'
		});
		const byDisplay = await createSetup(owner.id, {
			slug: `plain-a-${stamp}`,
			display: `Quokka Display ${stamp}`,
			description: 'nothing to see'
		});
		const byDescription = await createSetup(owner.id, {
			slug: `plain-b-${stamp}`,
			description: `A wombatdesc${stamp} workflow`
		});

		const idsFor = async (q: string) =>
			(await searchSetups({ q, sort: 'newest', page: 1 })).items.map((i) => i.id);

		expect(await idsFor(`zebraslug${stamp}`)).toEqual([bySlug.id]);
		expect(await idsFor(`Quokka Display ${stamp}`)).toEqual([byDisplay.id]);
		expect(await idsFor(`wombatdesc${stamp}`)).toEqual([byDescription.id]);
	});

	it('createSetup leaves readme null when no readme is passed', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `no-readme-${Date.now()}`,
			description: 'desc',
			files: [{ path: 'CLAUDE.md', componentType: 'instruction', content: '# hi' }]
		});

		const [row] = await db
			.select({ readme: setups.readme })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.readme).toBeNull();
	});

	it('createSetup with teamId forces private visibility regardless of visibility input', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		// Insert a team row directly so we have a teamId FK to reference.
		const [team] = await db
			.insert(teams)
			.values({ ownerId: owner.id, name: 'T', slug: `t-${Date.now()}` })
			.returning();

		try {
			const created = await createSetup(owner.id, {
				slug: `team-${Date.now()}`,
				description: 'desc',
				teamId: team.id,
				visibility: 'public'
			});

			const [row] = await db
				.select({ visibility: setups.visibility, teamId: setups.teamId })
				.from(setups)
				.where(eq(setups.id, created.id));
			expect(row.visibility).toBe('private');
			expect(row.teamId).toBe(team.id);
		} finally {
			await db.delete(teams).where(eq(teams.id, team.id));
		}
	});

	it('deleteSetup removes the setup, cascades to files/agents/tags/activities, and decrements setupsCount', async () => {
		const owner = await createTestUser();
		const agent = await createTestAgent();
		const tag = await createTestTag(`cascade-${Date.now()}`);
		createdUserIds.push(owner.id);
		createdAgentIds.push(agent.id);
		createdTagIds.push(tag.id);

		const created = await createSetup(owner.id, {
			slug: `delete-${Date.now()}`,
			description: 'desc',
			files: [{ path: 'a.md', componentType: 'instruction', content: 'a', agent: agent.slug }]
		});
		await db.insert(setupTags).values({ setupId: created.id, tagId: tag.id });
		const afterCreate = await getSetupsCount(owner.id);

		const deletedCount = await deleteSetup(created.id, owner.id);
		expect(deletedCount).toBe(1);

		expect(await db.select().from(setups).where(eq(setups.id, created.id))).toHaveLength(0);
		expect(
			await db.select().from(setupFiles).where(eq(setupFiles.setupId, created.id))
		).toHaveLength(0);
		expect(
			await db.select().from(setupAgents).where(eq(setupAgents.setupId, created.id))
		).toHaveLength(0);
		expect(await db.select().from(setupTags).where(eq(setupTags.setupId, created.id))).toHaveLength(
			0
		);
		expect(
			await db.select().from(activities).where(eq(activities.setupId, created.id))
		).toHaveLength(0);

		expect(await getSetupsCount(owner.id)).toBe(afterCreate - 1);
	});

	it('deleteSetup does not delete (or decrement counter) when userId does not match owner', async () => {
		const owner = await createTestUser();
		const imposter = await createTestUser();
		createdUserIds.push(owner.id, imposter.id);

		const created = await createSetup(owner.id, {
			slug: `owned-${Date.now()}`,
			description: 'desc'
		});
		const ownerCountBefore = await getSetupsCount(owner.id);

		const deletedCount = await deleteSetup(created.id, imposter.id);
		expect(deletedCount).toBe(0);
		expect(await db.select().from(setups).where(eq(setups.id, created.id))).toHaveLength(1);
		expect(await getSetupsCount(owner.id)).toBe(ownerCountBefore);
	});

	it('deleteSetupForce deletes regardless of caller and decrements owner setupsCount only once', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `force-${Date.now()}`,
			description: 'desc'
		});
		const afterCreate = await getSetupsCount(owner.id);

		const deletedCount = await deleteSetupForce(created.id, owner.id);
		expect(deletedCount).toBe(1);
		expect(await getSetupsCount(owner.id)).toBe(afterCreate - 1);

		// Running again on a setup that no longer exists returns 0 and must not go negative
		const secondDelete = await deleteSetupForce(created.id, owner.id);
		expect(secondDelete).toBe(0);
		expect(await getSetupsCount(owner.id)).toBe(afterCreate - 1);
	});

	it('getSetupByIdWithOwner returns the setup joined with owner username, or null when not found', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `owned-${Date.now()}`,
			description: 'desc'
		});

		const row = await getSetupByIdWithOwner(created.id);
		expect(row).not.toBeNull();
		expect(row!.id).toBe(created.id);
		expect(row!.ownerUsername).toBe(owner.username);
		expect(row!.visibility).toBeTruthy();

		// Non-existent id → null
		const missing = await getSetupByIdWithOwner('00000000-0000-0000-0000-000000000000');
		expect(missing).toBeNull();
	});

	it('updateSetupByIdWithSlugRedirects updates scalar fields without creating a redirect when name is unchanged', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `stable-${Date.now()}`,
			description: 'old desc'
		});

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ description: 'new desc', readme: '# new', license: 'MIT' },
			{ userId: owner.id, teamId: null, currentSlug: created.slug }
		);

		const [row] = await db
			.select({
				description: setups.description,
				readme: setups.readme,
				license: setups.license,
				slug: setups.slug
			})
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.description).toBe('new desc');
		expect(row.readme).toBe('# new');
		expect(row.license).toBe('MIT');
		expect(row.slug).toBe(created.slug);

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects).toHaveLength(0);
	});

	it('updateSetupByIdWithSlugRedirects renames the slug and inserts a redirect from the old slug', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `original-${Date.now()}`,
			description: 'desc'
		});
		const originalSlug = created.slug;
		const newSlug = `brand-new-${Date.now()}`;

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ slug: newSlug },
			{ userId: owner.id, teamId: null, currentSlug: originalSlug }
		);

		const [row] = await db
			.select({ slug: setups.slug })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.slug).toBe(newSlug);

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects).toHaveLength(1);
		expect(redirects[0].oldSlug).toBe(originalSlug);
		expect(redirects[0].userId).toBe(owner.id);
		expect(redirects[0].teamId).toBeNull();
	});

	it('updateSetupByIdWithSlugRedirects skips redirect insertion when the slug is unchanged', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `hello-world-${Date.now()}`,
			description: 'desc'
		});

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ slug: created.slug, description: 'changed' },
			{ userId: owner.id, teamId: null, currentSlug: created.slug }
		);

		const [row] = await db
			.select({ slug: setups.slug, description: setups.description })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.slug).toBe(created.slug);
		expect(row.description).toBe('changed');

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects).toHaveLength(0);
	});

	it('recordClone increments the setup clonesCount', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			slug: `clone-me-${Date.now()}`,
			description: 'desc'
		});

		const [before] = await db
			.select({ clonesCount: setups.clonesCount })
			.from(setups)
			.where(eq(setups.id, created.id));

		await recordClone(created.id);
		await recordClone(created.id);

		const [after] = await db
			.select({ clonesCount: setups.clonesCount })
			.from(setups)
			.where(eq(setups.id, created.id));

		expect(after.clonesCount).toBe(before.clonesCount + 2);
	});
});
