import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export async function refreshTrendingView(): Promise<void> {
	await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY trending_setups_mv`);
}
