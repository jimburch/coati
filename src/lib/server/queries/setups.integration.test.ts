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
	tags,
	teams,
	activities
} from '$lib/server/db/schema';
import { createSetup, updateSetup, deleteSetup, deleteSetupForce } from './setups';
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
});
