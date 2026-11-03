/**
 * Throwaway databases for tests that must own a whole database: migration
 * runs and the seed script (which truncates every table).
 *
 * Each one is created next to the test database (same server as
 * DATABASE_URL_TEST) and dropped afterwards, so the shared test database and
 * any dev database are never touched.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const MIGRATIONS_FOLDER = './drizzle';

export const hasTestDatabase = !!process.env.DATABASE_URL_TEST;

export interface ScratchDatabase {
	url: string;
	sql: postgres.Sql;
	drop: () => Promise<void>;
}

function withDatabaseName(url: string, name: string): string {
	const parsed = new URL(url);
	parsed.pathname = `/${name}`;
	return parsed.toString();
}

export async function createScratchDatabase(prefix: string): Promise<ScratchDatabase> {
	const baseUrl = process.env.DATABASE_URL_TEST;
	if (!baseUrl) throw new Error('DATABASE_URL_TEST is not set');

	const name = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	const admin = postgres(baseUrl, { max: 1, onnotice: () => {} });
	try {
		await admin.unsafe(`CREATE DATABASE "${name}"`);
	} finally {
		await admin.end();
	}

	const url = withDatabaseName(baseUrl, name);
	const sql = postgres(url, { max: 1, onnotice: () => {} });

	return {
		url,
		sql,
		drop: async () => {
			await sql.end();
			const dropper = postgres(baseUrl, { max: 1, onnotice: () => {} });
			try {
				await dropper.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
			} finally {
				await dropper.end();
			}
		}
	};
}

interface JournalEntry {
	idx: number;
	tag: string;
}

/**
 * Apply the repo's migrations to `url`. With `upTo`, stop after the migration
 * with that tag, so a database can be put in an older shape first.
 */
export async function migrateDatabase(url: string, options: { upTo?: string } = {}): Promise<void> {
	let folder = MIGRATIONS_FOLDER;
	let tempFolder: string | null = null;

	if (options.upTo) {
		tempFolder = mkdtempSync(join(tmpdir(), 'coati-migrations-'));
		cpSync(MIGRATIONS_FOLDER, tempFolder, { recursive: true });
		const journalPath = join(tempFolder, 'meta', '_journal.json');
		const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
			entries: JournalEntry[];
		};
		const stop = journal.entries.findIndex((e) => e.tag === options.upTo);
		if (stop === -1) throw new Error(`Unknown migration tag: ${options.upTo}`);
		journal.entries = journal.entries.slice(0, stop + 1);
		writeFileSync(journalPath, JSON.stringify(journal));
		folder = tempFolder;
	}

	const client = postgres(url, { max: 1, onnotice: () => {} });
	try {
		await migrate(drizzle(client), { migrationsFolder: folder });
	} finally {
		await client.end();
		if (tempFolder) rmSync(tempFolder, { recursive: true, force: true });
	}
}
