import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setups, users } from '$lib/server/db/schema';

export type BadgeState = 'available' | 'unavailable';

export async function getBadgeState(ownerUsername: string, slug: string): Promise<BadgeState> {
	const rows = await db
		.select({ visibility: setups.visibility })
		.from(setups)
		.innerJoin(users, eq(setups.userId, users.id))
		.where(and(eq(users.username, ownerUsername), eq(setups.slug, slug)))
		.limit(1);

	if (rows.length === 0 || rows[0].visibility !== 'public') {
		return 'unavailable';
	}
	return 'available';
}
