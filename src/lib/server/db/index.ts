import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

const requestDb = new AsyncLocalStorage<Database>();

/**
 * One short-lived client per request. Hyperdrive pools behind the binding, so
 * `max` only caps connections inside this isolate.
 *
 * `prepare: true` is required. `prepare: false` hangs on Hyperdrive's
 * transaction pooling mode.
 *
 * `fetch_types: true` because the schema uses `text[]` (`postInstall`,
 * `prerequisites`). postgres.js only installs array parsers inside
 * `fetchArrayTypes()`. Enums still come back as strings either way.
 */
export function createDb(connectionString: string) {
	const client = postgres(connectionString, { max: 5, fetch_types: true, prepare: true });
	return {
		db: drizzle(client, { schema }),
		end: () => client.end({ timeout: 5 })
	};
}

export function runWithDatabase<T>(database: Database, fn: () => T): T {
	return requestDb.run(database, fn);
}

let fallback: Database | null = null;

function currentDatabase(): Database {
	const active = requestDb.getStore();
	if (active) return active;
	if (!fallback) {
		const connectionString = env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL is not set and no request database is active');
		}
		fallback = createDb(connectionString).db;
	}
	return fallback;
}

/**
 * Request-scoped client when `runWithDatabase` is active, otherwise a lazy
 * client from `DATABASE_URL` (scripts and integration tests).
 * Do not open the fallback at import time.
 */
export const db: Database = new Proxy({} as Database, {
	get(_target, prop) {
		const current = currentDatabase();
		const value = Reflect.get(current, prop, current);
		return typeof value === 'function' ? value.bind(current) : value;
	}
});
