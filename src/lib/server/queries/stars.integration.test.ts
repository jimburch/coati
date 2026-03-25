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
import { toggleStar, isSetupStarredByUser } from './setups';
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

		const nowStarred = await toggleStar(user.id, setup.id);

		expect(nowStarred).toBe(true);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(true);

		const [{ starsCount }] = await db
			.select({ starsCount: setups.starsCount })
			.from(setups)
			.where(eq(setups.id, setup.id));
		expect(starsCount).toBe(1);
	});

	it('unstarring removes the relationship and decrements starsCount', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		// Star first
		await toggleStar(user.id, setup.id);

		// Then unstar
		const nowStarred = await toggleStar(user.id, setup.id);

		expect(nowStarred).toBe(false);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(false);

		const [{ starsCount }] = await db
			.select({ starsCount: setups.starsCount })
			.from(setups)
			.where(eq(setups.id, setup.id));
		expect(starsCount).toBe(0);
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

		await toggleStar(user.id, setup.id);

		const isStarred = await isSetupStarredByUser(setup.id, user.id);
		expect(isStarred).toBe(true);
	});

	it('double-star is idempotent (second call removes the star)', async () => {
		const user = await createTestUser();
		const setup = await createTestSetup(user.id);
		createdUserIds.push(user.id);

		// First call: stars
		const first = await toggleStar(user.id, setup.id);
		expect(first).toBe(true);

		// Second call: unstars — behaves as toggle, no error thrown
		const second = await toggleStar(user.id, setup.id);
		expect(second).toBe(false);

		// Star count returns to 0
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

		await toggleStar(starrer1.id, setup.id);
		await toggleStar(starrer2.id, setup.id);

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
