/**
 * Integration tests for getBadgeState.
 *
 * Hits the real database — no mocks. Requires a running PostgreSQL instance
 * pointed to by DATABASE_URL_TEST (preferred) or DATABASE_URL. When neither
 * is set the entire suite is skipped so that the CI unit-test run is unaffected.
 *
 * Pattern mirrors src/lib/server/queries/setups.integration.test.ts.
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
import { setups } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getBadgeState } from './badgeState';
import { createTestUser, createTestSetup, deleteTestUsers } from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('getBadgeState — integration', () => {
	const createdUserIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
	});

	it('returns available for a public setup', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		const state = await getBadgeState(user.username, setup.slug);
		expect(state).toBe('available');
	});

	it('returns unavailable for a private setup', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		await db.update(setups).set({ visibility: 'private' }).where(eq(setups.id, setup.id));

		const state = await getBadgeState(user.username, setup.slug);
		expect(state).toBe('unavailable');
	});

	it('returns unavailable when the slug does not exist', async () => {
		const state = await getBadgeState('nonexistent-user-xyz', 'nonexistent-slug-xyz');
		expect(state).toBe('unavailable');
	});
});
