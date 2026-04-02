/**
 * scripts/reset-db.ts
 *
 * Drops all schemas and recreates public, giving drizzle-kit migrate
 * a completely clean slate. Only for use in the test environment.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npx tsx scripts/reset-db.ts
 */

import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(databaseUrl);

console.log('Dropping drizzle migration tracking schema...');
await sql.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE');

console.log('Dropping public schema...');
await sql.unsafe('DROP SCHEMA public CASCADE');

console.log('Recreating public schema...');
await sql.unsafe('CREATE SCHEMA public');

console.log('Database reset complete.');
await sql.end();
