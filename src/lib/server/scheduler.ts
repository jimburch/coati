import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export async function refreshTrendingView(): Promise<void> {
	await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY trending_setups_mv`);
}

export function startScheduler(): void {
	setInterval(() => {
		refreshTrendingView().catch((err) => {
			console.error('[scheduler] Failed to refresh trending_setups_mv:', err);
		});
	}, REFRESH_INTERVAL_MS);
}
