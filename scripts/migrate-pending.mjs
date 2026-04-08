/**
 * One-time migration script that:
 * 1. Applies pending schema changes that drizzle-kit push can't handle automatically
 * 2. Bootstraps the drizzle migrations table so `drizzle-kit migrate` works going forward
 *
 * Run with: node scripts/migrate-pending.mjs
 *
 * This script is idempotent — safe to run multiple times.
 * After running, `drizzle-kit migrate` will correctly apply only future migrations.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

// All migrations and their journal timestamps, in order.
// These must match drizzle/meta/_journal.json entries.
const ALL_MIGRATIONS = [
	{ tag: '0000_lyrical_scarecrow', when: 1773342817773 },
	{ tag: '0001_cuddly_shadow_king', when: 1773351228875 },
	{ tag: '0002_tranquil_malcolm_colcord', when: 1773710822227 },
	{ tag: '0003_tools_to_agents', when: 1742860800000 },
	{ tag: '0004_activity_target_fields', when: 1742947200000 },
	{ tag: '0005_post_install_array', when: 1743033600000 },
	{ tag: '0006_user_profile_fields', when: 1743120000000 }
];

function hashMigration(tag) {
	const content = readFileSync(new URL(`../drizzle/${tag}.sql`, import.meta.url), 'utf-8');
	return createHash('sha256').update(content).digest('hex');
}

async function main() {
	console.log('=== Step 1: Apply pending schema changes ===\n');

	// 1a. post_install: text → text[] (needs USING clause for cast)
	const [postInstallCol] = await sql`
		SELECT data_type FROM information_schema.columns
		WHERE table_name = 'setups' AND column_name = 'post_install'
	`;

	if (postInstallCol?.data_type === 'text') {
		console.log('  Converting setups.post_install from text to text[]...');
		await sql`
			ALTER TABLE "setups" ALTER COLUMN "post_install" TYPE text[]
			USING CASE WHEN "post_install" IS NULL THEN NULL ELSE ARRAY["post_install"] END
		`;
		console.log('  Done.');
	} else {
		console.log('  setups.post_install already text[] — skipping.');
	}

	// 1b. Add name and location to users
	const existingCols = await sql`
		SELECT column_name FROM information_schema.columns
		WHERE table_name = 'users' AND column_name IN ('name', 'location')
	`;
	const existing = new Set(existingCols.map((r) => r.column_name));

	if (!existing.has('name')) {
		console.log('  Adding users.name...');
		await sql`ALTER TABLE "users" ADD COLUMN "name" varchar(100)`;
		console.log('  Done.');
	} else {
		console.log('  users.name already exists — skipping.');
	}

	if (!existing.has('location')) {
		console.log('  Adding users.location...');
		await sql`ALTER TABLE "users" ADD COLUMN "location" varchar(100)`;
		console.log('  Done.');
	} else {
		console.log('  users.location already exists — skipping.');
	}

	console.log('\n=== Step 2: Bootstrap drizzle migrations table ===\n');

	// Create the schema and table that drizzle-kit migrate expects
	await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
	await sql`
		CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		)
	`;

	// Check what's already recorded
	const recorded = await sql`
		SELECT hash, created_at FROM "drizzle"."__drizzle_migrations"
	`;
	const recordedTimestamps = new Set(recorded.map((r) => String(r.created_at)));

	// Insert entries for all migrations applied up to this point
	let inserted = 0;
	for (const migration of ALL_MIGRATIONS) {
		if (recordedTimestamps.has(String(migration.when))) {
			console.log(`  ${migration.tag} — already recorded, skipping.`);
			continue;
		}
		const hash = hashMigration(migration.tag);
		await sql`
			INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
			VALUES (${hash}, ${migration.when})
		`;
		console.log(`  ${migration.tag} — recorded.`);
		inserted++;
	}

	if (inserted === 0) {
		console.log('  All migrations already recorded.');
	} else {
		console.log(`\n  Recorded ${inserted} migration(s).`);
	}

	console.log('\nDone. `drizzle-kit migrate` will now work for future migrations.');
	await sql.end();
}

main().catch((e) => {
	console.error('Migration failed:', e);
	process.exit(1);
});
