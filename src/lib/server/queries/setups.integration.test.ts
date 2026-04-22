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
	updateSetup,
	deleteSetup,
	deleteSetupForce,
	getSetupByIdWithOwner,
	updateSetupByIdWithSlugRedirects,
	recordClone
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

	it('createSetup writes setup, files, tags, agents (from file slugs), activity, and increments owner setupsCount', async () => {
		const owner = await createTestUser();
		const agent = await createTestAgent();
		const tag = await createTestTag(`tag-${Date.now()}`);
		createdUserIds.push(owner.id);
		createdAgentIds.push(agent.id);
		createdTagIds.push(tag.id);

		const initialCount = await getSetupsCount(owner.id);

		const created = await createSetup(owner.id, {
			name: 'Created Setup',
			slug: `created-${Date.now()}`,
			description: 'desc',
			files: [
				{ path: 'CLAUDE.md', componentType: 'instruction', content: '# hi', agent: agent.slug },
				{ path: 'README.md', componentType: 'instruction', content: '# readme' }
			],
			tagIds: [tag.id]
		});

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

	it('createSetup leaves readme null when no readme is passed', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			name: 'No Readme',
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

	it('createSetup prefers explicit agentIds over inferring from file agent slugs', async () => {
		const owner = await createTestUser();
		const explicitAgent = await createTestAgent();
		const fileAgent = await createTestAgent();
		createdUserIds.push(owner.id);
		createdAgentIds.push(explicitAgent.id, fileAgent.id);

		const created = await createSetup(owner.id, {
			name: 'Explicit Agents',
			slug: `explicit-${Date.now()}`,
			description: 'desc',
			agentIds: [explicitAgent.id],
			files: [
				{
					path: 'a.md',
					componentType: 'instruction',
					content: 'x',
					agent: fileAgent.slug
				}
			]
		});

		const agentRows = await db
			.select()
			.from(setupAgents)
			.where(eq(setupAgents.setupId, created.id));
		// Only the explicit agent was linked; file-slug inference was skipped
		expect(agentRows.map((r) => r.agentId)).toEqual([explicitAgent.id]);
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
				name: 'Team Setup',
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

	it('updateSetup with files does not touch the readme column', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			name: 'Preserve Readme',
			slug: `preserve-${Date.now()}`,
			description: 'desc',
			files: [{ path: 'old.md', componentType: 'instruction', content: 'old' }]
		});

		// Seed a hand-written readme directly on the row
		const ownerReadme = '# My carefully-written README\n\nWith real content.';
		await db.update(setups).set({ readme: ownerReadme }).where(eq(setups.id, created.id));

		await updateSetup(created.id, {
			files: [{ path: 'new.md', componentType: 'instruction', content: 'new' }]
		});

		const [row] = await db
			.select({ readme: setups.readme })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.readme).toBe(ownerReadme);
	});

	it('updateSetup with files replaces setupFiles and refreshes setupAgents from new agent slugs', async () => {
		const owner = await createTestUser();
		const oldAgent = await createTestAgent();
		const newAgent = await createTestAgent();
		createdUserIds.push(owner.id);
		createdAgentIds.push(oldAgent.id, newAgent.id);

		const created = await createSetup(owner.id, {
			name: 'Update Me',
			slug: `update-${Date.now()}`,
			description: 'desc',
			files: [
				{ path: 'old.md', componentType: 'instruction', content: 'old', agent: oldAgent.slug }
			]
		});

		await updateSetup(created.id, {
			files: [
				{ path: 'new.md', componentType: 'instruction', content: 'new', agent: newAgent.slug },
				{ path: 'shared.md', componentType: 'instruction', content: 'shared' }
			]
		});

		const files = await db.select().from(setupFiles).where(eq(setupFiles.setupId, created.id));
		expect(files.map((f) => f.path).sort()).toEqual(['new.md', 'shared.md']);

		const agentRows = await db
			.select()
			.from(setupAgents)
			.where(eq(setupAgents.setupId, created.id));
		expect(agentRows.map((r) => r.agentId)).toEqual([newAgent.id]);
	});

	it('deleteSetup removes the setup, cascades to files/agents/tags/activities, and decrements setupsCount', async () => {
		const owner = await createTestUser();
		const agent = await createTestAgent();
		const tag = await createTestTag(`cascade-${Date.now()}`);
		createdUserIds.push(owner.id);
		createdAgentIds.push(agent.id);
		createdTagIds.push(tag.id);

		const created = await createSetup(owner.id, {
			name: 'Delete Me',
			slug: `delete-${Date.now()}`,
			description: 'desc',
			files: [{ path: 'a.md', componentType: 'instruction', content: 'a', agent: agent.slug }],
			tagIds: [tag.id]
		});
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
			name: 'Owned',
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
			name: 'Force Delete',
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
			name: 'Owned Setup',
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
			name: 'Stable Name',
			slug: `stable-${Date.now()}`,
			description: 'old desc'
		});

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ description: 'new desc', readme: '# new', license: 'MIT' },
			{ userId: owner.id, currentSlug: created.slug }
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

	it('updateSetupByIdWithSlugRedirects regenerates slug from new name and inserts a redirect from the old slug', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			name: 'Original Name',
			slug: `original-${Date.now()}`,
			description: 'desc'
		});
		const originalSlug = created.slug;

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ name: 'Brand New Name' },
			{ userId: owner.id, currentSlug: originalSlug }
		);

		const [row] = await db
			.select({ name: setups.name, slug: setups.slug })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.name).toBe('Brand New Name');
		expect(row.slug).toBe('brand-new-name');

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects).toHaveLength(1);
		expect(redirects[0].oldSlug).toBe(originalSlug);
		expect(redirects[0].userId).toBe(owner.id);
	});

	it('updateSetupByIdWithSlugRedirects skips redirect insertion when the normalized slug is unchanged', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const stamp = Date.now();
		const created = await createSetup(owner.id, {
			name: 'Hello World',
			slug: `hello-world-${stamp}`,
			description: 'desc'
		});

		// slugFromName('Hello World') === 'hello-world'. The stored slug includes a timestamp
		// suffix, so the new slug IS different here — choose a name that normalizes to the
		// exact stored slug to hit the slugChanged === false branch.
		await updateSetupByIdWithSlugRedirects(
			created.id,
			{ name: `hello world ${stamp}` },
			{ userId: owner.id, currentSlug: created.slug }
		);

		const [row] = await db
			.select({ name: setups.name, slug: setups.slug })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.slug).toBe(created.slug);
		expect(row.name).toBe(`hello world ${stamp}`);

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects).toHaveLength(0);
	});

	it('updateSetupByIdWithSlugRedirects replaces files and refreshes setupAgents from file slugs without touching the readme', async () => {
		const owner = await createTestUser();
		const oldAgent = await createTestAgent();
		const newAgent = await createTestAgent();
		createdUserIds.push(owner.id);
		createdAgentIds.push(oldAgent.id, newAgent.id);

		const created = await createSetup(owner.id, {
			name: 'File Update',
			slug: `file-update-${Date.now()}`,
			description: 'a nice description',
			files: [
				{ path: 'old.md', componentType: 'instruction', content: 'old', agent: oldAgent.slug }
			]
		});

		const ownerReadme = '# File Update\n\nOwner-authored content.';
		await db.update(setups).set({ readme: ownerReadme }).where(eq(setups.id, created.id));

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{
				files: [
					{ path: 'new.md', componentType: 'instruction', content: 'new', agent: newAgent.slug },
					{ path: 'plain.md', componentType: 'instruction', content: 'plain' }
				]
			},
			{ userId: owner.id, currentSlug: created.slug }
		);

		const files = await db.select().from(setupFiles).where(eq(setupFiles.setupId, created.id));
		expect(files.map((f) => f.path).sort()).toEqual(['new.md', 'plain.md']);

		const agentRows = await db
			.select()
			.from(setupAgents)
			.where(eq(setupAgents.setupId, created.id));
		expect(agentRows.map((r) => r.agentId)).toEqual([newAgent.id]);

		// Readme is not touched by file updates — owner edits survive
		const [row] = await db
			.select({ readme: setups.readme })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.readme).toBe(ownerReadme);
	});

	it('updateSetupByIdWithSlugRedirects handles slug change and file replacement in a single call', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			name: 'Combined',
			slug: `combined-${Date.now()}`,
			description: 'desc',
			files: [{ path: 'one.md', componentType: 'instruction', content: 'one' }]
		});
		const originalSlug = created.slug;

		await updateSetupByIdWithSlugRedirects(
			created.id,
			{
				name: 'Renamed Combined',
				files: [{ path: 'two.md', componentType: 'instruction', content: 'two' }]
			},
			{ userId: owner.id, currentSlug: originalSlug }
		);

		const [row] = await db
			.select({ slug: setups.slug })
			.from(setups)
			.where(eq(setups.id, created.id));
		expect(row.slug).toBe('renamed-combined');

		const files = await db.select().from(setupFiles).where(eq(setupFiles.setupId, created.id));
		expect(files.map((f) => f.path)).toEqual(['two.md']);

		const redirects = await db
			.select()
			.from(setupSlugRedirects)
			.where(eq(setupSlugRedirects.setupId, created.id));
		expect(redirects.map((r) => r.oldSlug)).toEqual([originalSlug]);
	});

	it('recordClone increments the setup clonesCount', async () => {
		const owner = await createTestUser();
		createdUserIds.push(owner.id);

		const created = await createSetup(owner.id, {
			name: 'Clone Me',
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
