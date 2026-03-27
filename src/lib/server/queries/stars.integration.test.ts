/**
 * Integration tests for star query functions.
 *
 * These tests hit the real database — no mocks. They require a running
 * PostgreSQL instance pointed to by DATABASE_URL_TEST (preferred) or
 * DATABASE_URL. When neither is set the entire suite is skipped so that
 * the CI unit-test run is unaffected.
 *
 * This file also establishes the DB setup/teardown helper pattern that
 * follow query tests will reuse (see __tests__/db-test-helpers.ts).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

// Must be declared before any module imports so that the hoisted mock is in
// place when $lib/server/db initialises its postgres connection.
vi.mock('$env/static/private', () => ({
	DATABASE_URL:
		process.env.DATABASE_URL_TEST ??
		process.env.DATABASE_URL ??
		'postgresql://coati:coati@localhost:5432/coati_dev',
	GITHUB_CLIENT_ID: 'test',
	GITHUB_CLIENT_SECRET: 'test'
}));

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setups } from '$lib/server/db/schema';
import { isSetupStarredByUser, setStar } from './setups';
import { setupRepo } from './setupRepository';
import { createTestUser, createTestSetup, deleteTestUsers } from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('star queries — integration', () => {
	// Collect user IDs created in each test so we can cascade-delete them.
	const createdUserIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
	});

	it('starring a setup creates the relationship and increments starsCount', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		const result = await setupRepo.setStar(user.id, setup.id, true);

		expect(result.starred).toBe(true);
		expect(result.starsCount).toBe(1);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(true);
	});

	it('unstarring removes the relationship and decrements starsCount', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		// Star first
		await setupRepo.setStar(user.id, setup.id, true);

		// Then unstar
		const result = await setupRepo.setStar(user.id, setup.id, false);

		expect(result.starred).toBe(false);
		expect(result.starsCount).toBe(0);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(false);
	});

	it('isSetupStarredByUser returns false when setup is not starred', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(false);
	});

	it('isSetupStarredByUser returns true after starring', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		await setupRepo.setStar(user.id, setup.id, true);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(true);
	});

	it('setStar is idempotent: double-star returns starred=true without error', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		// First call: stars
		const first = await setStar(user.id, setup.id, true);
		expect(first.starred).toBe(true);

		// Second call with same desired=true: no-op, stays starred
		const second = await setStar(user.id, setup.id, true);
		expect(second.starred).toBe(true);

		// Star count stays at 1 (not incremented twice)
		const [{ starsCount }] = await db
			.select({ starsCount: setups.starsCount })
			.from(setups)
			.where(eq(setups.id, setup.id));
		expect(starsCount).toBe(1);
	});

	it('setStar is idempotent: double-unstar returns starred=false without error', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		// Star it first
		await setStar(user.id, setup.id, true);

		// Unstar
		const first = await setStar(user.id, setup.id, false);
		expect(first.starred).toBe(false);

		// Unstar again: no-op
		const second = await setStar(user.id, setup.id, false);
		expect(second.starred).toBe(false);

		// Star count stays at 0 (not decremented below 0)
		const [{ starsCount }] = await db
			.select({ starsCount: setups.starsCount })
			.from(setups)
			.where(eq(setups.id, setup.id));
		expect(starsCount).toBe(0);
	});

	it('multiple users can star the same setup independently', async () => {
		const owner = await createTestUser();
		const starrer1 = await createTestUser();
		const starrer2 = await createTestUser();
		const setup = await createTestSetup(owner.id);
		createdUserIds.push(owner.id, starrer1.id, starrer2.id);

		await setupRepo.setStar(starrer1.id, setup.id, true);
		await setupRepo.setStar(starrer2.id, setup.id, true);

		const [{ starsCount }] = await db
			.select({ starsCount: setups.starsCount })
			.from(setups)
			.where(eq(setups.id, setup.id));
		expect(starsCount).toBe(2);

		expect(await isSetupStarredByUser(setup.id, starrer1.id)).toBe(true);
		expect(await isSetupStarredByUser(setup.id, starrer2.id)).toBe(true);
		expect(await isSetupStarredByUser(setup.id, owner.id)).toBe(false);
	});
});
