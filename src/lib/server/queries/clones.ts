/**
 * Clone tracking (spec §5 "Clone", #394). One `setup_clones` row per cloner
 * per Setup: an authenticated user, or an anonymous key that's stable for one
 * UTC day. `clones_count` counts rows, so re-clones don't change it.
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { activities, setupClones, setups } from '$lib/server/db/schema';
import { toHex } from '$lib/server/crypto';

export type Cloner = { userId: string } | { anonKey: string };

const encoder = new TextEncoder();

async function hmacSha256(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))));
}

/**
 * `sha256hex(HMAC(secret, utcDate) + clientIp)` (Decided #20). The daily salt is
 * derived, never stored, so yesterday's keys can't be recomputed without the
 * secret and a key never matches across days.
 */
export async function anonCloneKey(
	secret: string,
	clientIp: string,
	now = new Date()
): Promise<string> {
	const salt = await hmacSha256(secret, now.toISOString().slice(0, 10));
	const digest = await crypto.subtle.digest('SHA-256', encoder.encode(salt + clientIp));
	return toHex(new Uint8Array(digest));
}

/**
 * Upserts the cloner's row. A new row increments `clones_count`, and a new
 * authenticated row writes `cloned_setup` Activity. A repeat only moves
 * `last_cloned_at`.
 */
export async function recordSetupClone(
	setupId: string,
	cloner: Cloner
): Promise<{ firstClone: boolean; clonesCount: number }> {
	return db.transaction(async (tx) => {
		const now = new Date();
		const isUser = 'userId' in cloner;
		const inserted = await tx
			.insert(setupClones)
			.values({
				setupId,
				...(isUser ? { userId: cloner.userId } : { anonKey: cloner.anonKey }),
				firstClonedAt: now,
				lastClonedAt: now
			})
			.onConflictDoNothing({
				target: isUser
					? [setupClones.setupId, setupClones.userId]
					: [setupClones.setupId, setupClones.anonKey],
				where: isUser
					? sql`${setupClones.userId} IS NOT NULL`
					: sql`${setupClones.anonKey} IS NOT NULL`
			})
			.returning({ id: setupClones.id });
		const firstClone = inserted.length > 0;

		if (firstClone) {
			const [row] = await tx
				.update(setups)
				.set({ clonesCount: sql`${setups.clonesCount} + 1` })
				.where(eq(setups.id, setupId))
				.returning({ clonesCount: setups.clonesCount });
			if (isUser) {
				await tx
					.insert(activities)
					.values({ userId: cloner.userId, setupId, actionType: 'cloned_setup' });
			}
			return { firstClone, clonesCount: row.clonesCount };
		}

		await tx
			.update(setupClones)
			.set({ lastClonedAt: now })
			.where(
				and(
					eq(setupClones.setupId, setupId),
					isUser ? eq(setupClones.userId, cloner.userId) : eq(setupClones.anonKey, cloner.anonKey)
				)
			);
		const [row] = await tx
			.select({ clonesCount: setups.clonesCount })
			.from(setups)
			.where(eq(setups.id, setupId));
		return { firstClone, clonesCount: row.clonesCount };
	});
}
