import { eq, or, ilike, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, setups, follows } from '$lib/server/db/schema';

export async function getUserByUsername(username: string) {
	const result = await db
		.select({
			id: users.id,
			username: users.username,
			avatarUrl: users.avatarUrl,
			name: users.name,
			bio: users.bio,
			websiteUrl: users.websiteUrl,
			location: users.location,
			githubUsername: users.githubUsername,
			setupsCount: users.setupsCount,
			followersCount: users.followersCount,
			followingCount: users.followingCount,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.username, username))
		.limit(1);

	return result[0] ?? null;
}

export async function getUserById(userId: string) {
	const result = await db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			avatarUrl: users.avatarUrl,
			name: users.name,
			bio: users.bio,
			websiteUrl: users.websiteUrl,
			location: users.location,
			githubUsername: users.githubUsername,
			setupsCount: users.setupsCount,
			followersCount: users.followersCount,
			followingCount: users.followingCount,
			isAdmin: users.isAdmin,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	return result[0] ?? null;
}

type UpdateProfileData = {
	name?: string;
	bio?: string;
	websiteUrl?: string;
	location?: string;
};

function emptyToNull(value: string | undefined): string | null | undefined {
	if (value === undefined) return undefined;
	return value === '' ? null : value;
}

export async function updateLastLoginAt(userId: string) {
	await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

export function buildUserSearchPattern(q: string): string {
	return `${q.trim().toLowerCase()}%`;
}

export async function searchUsers(q: string, limit: number = 3) {
	const pattern = buildUserSearchPattern(q);
	return db
		.select({
			id: users.id,
			username: users.username,
			name: users.name,
			avatarUrl: users.avatarUrl,
			setupsCount: users.setupsCount
		})
		.from(users)
		.where(or(ilike(users.username, pattern), ilike(users.name, pattern)))
		.limit(limit);
}

export async function updateUserProfile(userId: string, data: UpdateProfileData) {
	const result = await db
		.update(users)
		.set({
			...(data.name !== undefined && { name: emptyToNull(data.name) }),
			...(data.bio !== undefined && { bio: emptyToNull(data.bio) }),
			...(data.websiteUrl !== undefined && { websiteUrl: emptyToNull(data.websiteUrl) }),
			...(data.location !== undefined && { location: emptyToNull(data.location) })
		})
		.where(eq(users.id, userId))
		.returning();

	return result[0] ?? null;
}

export async function getUserAggregateStats(userId: string) {
	const [setupStats, followStats] = await Promise.all([
		db
			.select({
				setupsCount: sql<number>`count(*)::int`,
				starsReceived: sql<number>`coalesce(sum(${setups.starsCount}), 0)::int`,
				clonesTotal: sql<number>`coalesce(sum(${setups.clonesCount}), 0)::int`
			})
			.from(setups)
			.where(eq(setups.userId, userId))
			.limit(1),
		db
			.select({ followingCount: sql<number>`count(*)::int` })
			.from(follows)
			.where(eq(follows.followerId, userId))
			.limit(1)
	]);

	const s = setupStats[0];
	const f = followStats[0];
	return {
		setupsCount: s?.setupsCount ?? 0,
		starsReceived: s?.starsReceived ?? 0,
		clonesTotal: s?.clonesTotal ?? 0,
		followingCount: f?.followingCount ?? 0
	};
}

export async function getUserSetups(userId: string, limit: number) {
	return db
		.select({
			id: setups.id,
			name: setups.name,
			slug: setups.slug,
			description: setups.description,
			display: setups.display,
			visibility: setups.visibility,
			starsCount: setups.starsCount,
			clonesCount: setups.clonesCount,
			updatedAt: setups.updatedAt
		})
		.from(setups)
		.where(eq(setups.userId, userId))
		.orderBy(desc(setups.updatedAt))
		.limit(limit);
}
