import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { follows, activities, users } from '$lib/server/db/schema';
import { counters } from '$lib/server/counters';

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
	const result = await db
		.select({ id: follows.id })
		.from(follows)
		.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
		.limit(1);
	return result.length > 0;
}

export async function setFollow(
	followerId: string,
	followingId: string,
	desired: boolean
): Promise<{ following: boolean; followersCount: number }> {
	if (followerId === followingId) {
		throw new Error('Cannot follow yourself');
	}

	return db.transaction(async (tx) => {
		const existing = await tx
			.select({ id: follows.id })
			.from(follows)
			.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
			.limit(1);

		const alreadyFollowing = existing.length > 0;

		if (desired === alreadyFollowing) {
			// No-op: read current followersCount and return
			const [targetRow] = await tx
				.select({ followersCount: users.followersCount })
				.from(users)
				.where(eq(users.id, followingId));
			return { following: alreadyFollowing, followersCount: targetRow.followersCount };
		}

		if (desired) {
			await tx.insert(follows).values({ followerId, followingId });
			await counters.follow(tx, followerId, followingId, true);
			await tx
				.insert(activities)
				.values({ userId: followerId, actionType: 'followed_user', targetUserId: followingId });
		} else {
			await tx.delete(follows).where(eq(follows.id, existing[0].id));
			await counters.follow(tx, followerId, followingId, false);
		}

		const [updatedTarget] = await tx
			.select({ followersCount: users.followersCount })
			.from(users)
			.where(eq(users.id, followingId));

		return { following: desired, followersCount: updatedTarget.followersCount };
	});
}
