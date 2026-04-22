/**
 * Integration tests for getTeamBadgeState.
 *
 * Hits the real database — no mocks. Requires a running PostgreSQL instance
 * pointed to by DATABASE_URL_TEST (preferred) or DATABASE_URL. When neither
 * is set the entire suite is skipped so that the CI unit-test run is unaffected.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

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

import { db } from '$lib/server/db';
import { setups, teams } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getTeamBadgeState } from './badgeState';
import { createTestUser, createTestSetup, deleteTestUsers } from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

let _seq = 0;
function uid(): string {
	return `${Date.now()}-${++_seq}-${Math.floor(Math.random() * 10000)}`;
}

async function createTestTeam(ownerId: string): Promise<{ id: string; slug: string }> {
	const id = uid();
	const [team] = await db
		.insert(teams)
		.values({
			name: `Test Team ${id}`,
			slug: `test-team-${id}`,
			ownerId
		})
		.returning();
	return team;
}

async function deleteTestTeams(teamIds: string[]): Promise<void> {
	if (teamIds.length === 0) return;
	await db.delete(teams).where(inArray(teams.id, teamIds));
}

describe.skipIf(!hasDatabase)('getTeamBadgeState — integration', () => {
	const createdUserIds: string[] = [];
	const createdTeamIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
		await deleteTestTeams(createdTeamIds.splice(0));
	});

	it('returns available for a public team setup', async () => {
		const user = await createTestUser();
		createdUserIds.push(user.id);
		const team = await createTestTeam(user.id);
		createdTeamIds.push(team.id);
		const setup = await createTestSetup(user.id);
		await db.update(setups).set({ teamId: team.id }).where(eq(setups.id, setup.id));

		const state = await getTeamBadgeState(team.slug, setup.slug);
		expect(state).toBe('available');
	});

	it('returns unavailable for a private team setup', async () => {
		const user = await createTestUser();
		createdUserIds.push(user.id);
		const team = await createTestTeam(user.id);
		createdTeamIds.push(team.id);
		const setup = await createTestSetup(user.id);
		await db
			.update(setups)
			.set({ teamId: team.id, visibility: 'private' })
			.where(eq(setups.id, setup.id));

		const state = await getTeamBadgeState(team.slug, setup.slug);
		expect(state).toBe('unavailable');
	});

	it('returns unavailable when team slug does not exist', async () => {
		const state = await getTeamBadgeState('nonexistent-team-xyz', 'nonexistent-slug-xyz');
		expect(state).toBe('unavailable');
	});

	it('returns unavailable when setup slug does not exist for a valid team', async () => {
		const user = await createTestUser();
		createdUserIds.push(user.id);
		const team = await createTestTeam(user.id);
		createdTeamIds.push(team.id);

		const state = await getTeamBadgeState(team.slug, 'nonexistent-slug-xyz');
		expect(state).toBe('unavailable');
	});
});
