import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { follows, activities } from '$lib/server/db/schema';
import { counters } from '$lib/server/counters';

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
			await counters.follow(tx, followerId, followingId, false);
			return false;
		} else {
			await tx.insert(follows).values({ followerId, followingId });
			await counters.follow(tx, followerId, followingId, true);
			await tx
				.insert(activities)
				.values({ userId: followerId, actionType: 'followed_user', targetUserId: followingId });
			return true;
		}
	});
}
