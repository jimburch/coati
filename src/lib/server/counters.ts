import { eq, sql } from 'drizzle-orm';
import { users, setups } from '$lib/server/db/schema';

type Tx = Parameters<Parameters<typeof import('$lib/server/db').db.transaction>[0]>[0];

export const counters = {
	async setupCreated(tx: Tx, userId: string): Promise<void> {
		await tx
			.update(users)
			.set({ setupsCount: sql`${users.setupsCount} + 1` })
			.where(eq(users.id, userId));
	},

	async setupDeleted(tx: Tx, userId: string): Promise<void> {
		await tx
			.update(users)
			.set({ setupsCount: sql`GREATEST(${users.setupsCount} - 1, 0)` })
			.where(eq(users.id, userId));
	},

	async cloneRecorded(tx: Tx, setupId: string): Promise<void> {
		await tx
			.update(setups)
			.set({ clonesCount: sql`${setups.clonesCount} + 1` })
			.where(eq(setups.id, setupId));
	},

	async star(tx: Tx, setupId: string, added: boolean): Promise<void> {
		await tx
			.update(setups)
			.set({
				starsCount: added
					? sql`${setups.starsCount} + 1`
					: sql`GREATEST(${setups.starsCount} - 1, 0)`
			})
			.where(eq(setups.id, setupId));
	},

	async follow(tx: Tx, followerId: string, followedId: string, added: boolean): Promise<void> {
		await tx
			.update(users)
			.set({
				followersCount: added
					? sql`${users.followersCount} + 1`
					: sql`GREATEST(${users.followersCount} - 1, 0)`
			})
			.where(eq(users.id, followedId));

		await tx
			.update(users)
			.set({
				followingCount: added
					? sql`${users.followingCount} + 1`
					: sql`GREATEST(${users.followingCount} - 1, 0)`
			})
			.where(eq(users.id, followerId));
	},

	async commentCreated(tx: Tx, setupId: string): Promise<void> {
		await tx
			.update(setups)
			.set({ commentsCount: sql`${setups.commentsCount} + 1` })
			.where(eq(setups.id, setupId));
	},

	async commentsDeleted(tx: Tx, setupId: string, count: number): Promise<void> {
		await tx
			.update(setups)
			.set({ commentsCount: sql`GREATEST(${setups.commentsCount} - ${count}, 0)` })
			.where(eq(setups.id, setupId));
	}
};
