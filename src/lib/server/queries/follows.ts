import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { follows, users, activities } from '$lib/server/db/schema';

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
	const result = await db
		.select({ id: follows.id })
		.from(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
		.limit(1);
	return result.length > 0;
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
	if (followerId === followingId) {
		throw new Error('Cannot follow yourself');
	}

	return db.transaction(async (tx) => {
		const existing = await tx
			.select({ id: follows.id })
			.from(follows)
			.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
			.limit(1);

		if (existing.length > 0) {
			await tx.delete(follows).where(eq(follows.id, existing[0].id));
			await tx
				.update(users)
				.set({ followersCount: sql`${users.followersCount} - 1` })
				.where(eq(users.id, followingId));
			await tx
				.update(users)
				.set({ followingCount: sql`${users.followingCount} - 1` })
				.where(eq(users.id, followerId));
			return false;
		} else {
			await tx.insert(follows).values({ followerId, followingId });
			await tx
				.update(users)
				.set({ followersCount: sql`${users.followersCount} + 1` })
				.where(eq(users.id, followingId));
			await tx
				.update(users)
				.set({ followingCount: sql`${users.followingCount} + 1` })
				.where(eq(users.id, followerId));
			await tx.insert(activities).values({ userId: followerId, actionType: 'followed_user' });
			return true;
		}
	});
}
