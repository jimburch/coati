/**
 * scripts/migrate-test-db.ts
 *
 * Applies Drizzle migrations to the test database. Invoked two ways:
 *
 *   1. `pnpm db:migrate:test` — runs standalone from the shell.
 *   2. Vitest `globalSetup` — runs once before the server test project
 *      so integration tests never race a missing schema.
 *
 * Apply-only (never drops). Idempotent. Skips gracefully when
 * DATABASE_URL_TEST is unset, mirroring the `skipIf(!hasDatabase)`
 * guard in the integration test files.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export async function setup(): Promise<void> {
	const url = process.env.DATABASE_URL_TEST;
	if (!url) {
		console.log('[migrate-test-db] DATABASE_URL_TEST not set — skipping.');
		return;
	}

	const client = postgres(url, { max: 1 });
	try {
		await migrate(drizzle(client), { migrationsFolder: './drizzle' });
	} finally {
		await client.end();
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await setup();
}
