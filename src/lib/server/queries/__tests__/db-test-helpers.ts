/**
 * Reusable DB test helpers for integration tests.
 *
 * Provides factory functions for creating test fixtures (users, setups) and
 * cleanup utilities. Imported by star and follow query integration tests.
 *
 * Prerequisites:
 * - The test file must mock `$env/static/private` before importing this module.
 * - Cleaning up test users cascades to all dependent rows (setups, stars, follows, etc.)
 *   thanks to `onDelete: 'cascade'` constraints on the schema.
 */

import { db } from '$lib/server/db';
import { users, setups } from '$lib/server/db/schema';
import type { User, Setup } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

let _seq = 0;

function uid(): string {
	return `${Date.now()}-${++_seq}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Insert a test user into the database. Returns the full user row.
 * The caller is responsible for adding the user's ID to the cleanup list.
 */
export async function createTestUser(): Promise<User> {
	const id = uid();
	const [user] = await db
		.insert(users)
		.values({
			githubId: Math.floor(Math.random() * 2_000_000_000),
			username: `test-user-${id}`,
			email: `test-user-${id}@example.test`,
			avatarUrl: 'https://example.com/avatar.png',
			githubUsername: `test-user-${id}`
		})
		.returning();
	return user;
}

/**
 * Insert a test setup owned by `userId`. Returns the full setup row.
 */
export async function createTestSetup(userId: string): Promise<Setup> {
	const id = uid();
	const [setup] = await db
		.insert(setups)
		.values({
			userId,
			name: `Test Setup ${id}`,
			slug: `test-setup-${id}`,
			description: 'Integration test setup'
		})
		.returning();
	return setup;
}

/**
 * Delete test users by ID. Cascades to setups, stars, follows, comments, etc.
 * Call this in `afterEach` to clean up test data.
 */
export async function deleteTestUsers(userIds: string[]): Promise<void> {
	if (userIds.length === 0) return;
	await db.delete(users).where(inArray(users.id, userIds));
}
