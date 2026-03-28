import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

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
