import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setupShares, users } from '$lib/server/db/schema';

export async function shareSetup(
	setupId: string,
	sharedByUserId: string,
	sharedWithUserId: string
) {
	const [share] = await db
		.insert(setupShares)
		.values({ setupId, sharedByUserId, sharedWithUserId })
		.returning();
	return share;
}

export async function unshareSetup(setupId: string, sharedWithUserId: string) {
	await db
		.delete(setupShares)
		.where(
			and(eq(setupShares.setupId, setupId), eq(setupShares.sharedWithUserId, sharedWithUserId))
		);
}

export async function getSetupShares(setupId: string) {
	return db
		.select({
			id: setupShares.id,
			sharedWithUserId: setupShares.sharedWithUserId,
			sharedWithUsername: users.username,
			sharedWithAvatarUrl: users.avatarUrl,
			createdAt: setupShares.createdAt
		})
		.from(setupShares)
		.innerJoin(users, eq(setupShares.sharedWithUserId, users.id))
		.where(eq(setupShares.setupId, setupId));
}
