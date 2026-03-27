/**
 * Integration tests for follow query functions.
 *
 * These tests hit the real database — no mocks. They require a running
 * PostgreSQL instance pointed to by DATABASE_URL_TEST (preferred) or
 * DATABASE_URL. When neither is set the entire suite is skipped so that
 * the CI unit-test run is unaffected.
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
import { users, activities } from '$lib/server/db/schema';
import { isFollowing, setFollow } from './follows';
import { createTestUser, deleteTestUsers } from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('follow queries — integration', () => {
	const createdUserIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
	});

	it('isFollowing returns false when no follow relationship exists', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		const result = await isFollowing(follower.id, target.id);
		expect(result).toBe(false);
	});

	it('isFollowing returns true after following', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);

		const result = await isFollowing(follower.id, target.id);
		expect(result).toBe(true);
	});

	it('setFollow(true) creates follow relationship', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		const result = await setFollow(follower.id, target.id, true);
		expect(result.following).toBe(true);

		expect(await isFollowing(follower.id, target.id)).toBe(true);
	});

	it('setFollow(false) removes existing follow relationship', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);
		const result = await setFollow(follower.id, target.id, false);

		expect(result.following).toBe(false);
		expect(await isFollowing(follower.id, target.id)).toBe(false);
	});

	it('followersCount on target increments and decrements correctly', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);

		const [after] = await db
			.select({ followersCount: users.followersCount })
			.from(users)
			.where(eq(users.id, target.id));
		expect(after.followersCount).toBe(1);

		await setFollow(follower.id, target.id, false);

		const [afterUnfollow] = await db
			.select({ followersCount: users.followersCount })
			.from(users)
			.where(eq(users.id, target.id));
		expect(afterUnfollow.followersCount).toBe(0);
	});

	it('followingCount on follower increments and decrements correctly', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);

		const [after] = await db
			.select({ followingCount: users.followingCount })
			.from(users)
			.where(eq(users.id, follower.id));
		expect(after.followingCount).toBe(1);

		await setFollow(follower.id, target.id, false);

		const [afterUnfollow] = await db
			.select({ followingCount: users.followingCount })
			.from(users)
			.where(eq(users.id, follower.id));
		expect(afterUnfollow.followingCount).toBe(0);
	});

	it('activity with followed_user type is created on follow', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);

		const records = await db.select().from(activities).where(eq(activities.userId, follower.id));

		expect(records).toHaveLength(1);
		expect(records[0].actionType).toBe('followed_user');
	});

	it('no activity is created on unfollow', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);
		await setFollow(follower.id, target.id, false);

		const records = await db.select().from(activities).where(eq(activities.userId, follower.id));

		// Only one activity from the initial follow, none from unfollow
		expect(records).toHaveLength(1);
	});

	it('self-follow is rejected', async () => {
		const user = await createTestUser();
		createdUserIds.push(user.id);

		await expect(setFollow(user.id, user.id, true)).rejects.toThrow('Cannot follow yourself');
	});

	// ── setFollow tests ───────────────────────────────────────────────────────

	it('setFollow(true) follows when not already following', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		const result = await setFollow(follower.id, target.id, true);

		expect(result.following).toBe(true);
		expect(result.followersCount).toBe(1);
		expect(await isFollowing(follower.id, target.id)).toBe(true);
	});

	it('setFollow(true) is a no-op when already following', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);
		const result = await setFollow(follower.id, target.id, true);

		expect(result.following).toBe(true);
		expect(result.followersCount).toBe(1);
	});

	it('setFollow(false) unfollows when following', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);
		const result = await setFollow(follower.id, target.id, false);

		expect(result.following).toBe(false);
		expect(result.followersCount).toBe(0);
		expect(await isFollowing(follower.id, target.id)).toBe(false);
	});

	it('setFollow(false) is a no-op when not following', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		const result = await setFollow(follower.id, target.id, false);

		expect(result.following).toBe(false);
		expect(result.followersCount).toBe(0);
	});

	it('setFollow throws on self-follow', async () => {
		const user = await createTestUser();
		createdUserIds.push(user.id);

		await expect(setFollow(user.id, user.id, true)).rejects.toThrow('Cannot follow yourself');
	});

	it('setFollow(true) creates activity record only on new follow', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);
		// No-op call — should not create another activity
		await setFollow(follower.id, target.id, true);

		const records = await db.select().from(activities).where(eq(activities.userId, follower.id));
		expect(records).toHaveLength(1);
		expect(records[0].actionType).toBe('followed_user');
	});

	it('setFollow(false) does not create activity record on unfollow', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);
		await setFollow(follower.id, target.id, false);

		const records = await db.select().from(activities).where(eq(activities.userId, follower.id));
		// Only the initial follow creates an activity
		expect(records).toHaveLength(1);
	});

	it('setFollow updates followingCount on the follower', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);

		const [row] = await db
			.select({ followingCount: users.followingCount })
			.from(users)
			.where(eq(users.id, follower.id));
		expect(row.followingCount).toBe(1);

		await setFollow(follower.id, target.id, false);

		const [rowAfter] = await db
			.select({ followingCount: users.followingCount })
			.from(users)
			.where(eq(users.id, follower.id));
		expect(rowAfter.followingCount).toBe(0);
	});

	it('setFollow followersCount is read from inside the transaction', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		const result = await setFollow(follower.id, target.id, true);

		// The returned followersCount must match the DB value after mutation
		const [row] = await db
			.select({ followersCount: users.followersCount })
			.from(users)
			.where(eq(users.id, target.id));
		expect(result.followersCount).toBe(row.followersCount);
	});

	// ── atomicity test ────────────────────────────────────────────────────────

	it('setFollow is atomic — all side effects happen together', async () => {
		const follower = await createTestUser();
		const target = await createTestUser();
		createdUserIds.push(follower.id, target.id);

		await setFollow(follower.id, target.id, true);

		const [followerRow] = await db
			.select({ followingCount: users.followingCount })
			.from(users)
			.where(eq(users.id, follower.id));
		const [targetRow] = await db
			.select({ followersCount: users.followersCount })
			.from(users)
			.where(eq(users.id, target.id));

		expect(followerRow.followingCount).toBe(1);
		expect(targetRow.followersCount).toBe(1);
		expect(await isFollowing(follower.id, target.id)).toBe(true);
	});
});
