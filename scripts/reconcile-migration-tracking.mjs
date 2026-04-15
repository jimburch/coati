/**
 * Reconcile drizzle.__drizzle_migrations with the current journal.
 *
 * Background: migration 0015 was generated with an inflated `when` timestamp
 * (year 2026). Once applied, drizzle's migrator treated any subsequent entry
 * with an earlier timestamp as already-applied and silently skipped it. As a
 * result, 0016 (and beyond) never runs with plain `drizzle-kit migrate`, even
 * though the journal and SQL files are present.
 *
 * Fix strategy:
 *   1. `_journal.json` has been rewritten so all `when` values increase
 *      monotonically with idx. Hashes in `__drizzle_migrations` are unchanged
 *      because they are sha256 of the SQL file contents, not the journal.
 *   2. This script aligns `__drizzle_migrations.created_at` with the new
 *      monotonic `when` values (matched by hash, so nothing is guessed).
 *   3. For journal entries whose hash is NOT recorded, the script either
 *      applies the SQL (default) or marks it applied without running the SQL
 *      (use `--mark-applied=<tag[,tag...]>` when the schema is already present
 *      from an earlier `drizzle-kit push` or manual patch).
 *
 * Usage:
 *   node scripts/reconcile-migration-tracking.mjs               # dry run
 *   node scripts/reconcile-migration-tracking.mjs --apply       # apply changes
 *   node scripts/reconcile-migration-tracking.mjs --apply \
 *        --mark-applied=0000_lyrical_scarecrow,0001_cuddly_shadow_king
 *
 * The script is transactional and idempotent. Re-running after success is a
 * no-op. The DATABASE_URL env var controls which database is targeted — set
 * it explicitly before pointing at staging or production.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const DRY_RUN = !process.argv.includes('--apply');
const MARK_APPLIED_ARG = process.argv.find((a) => a.startsWith('--mark-applied='));
const MARK_APPLIED = new Set(
	MARK_APPLIED_ARG
		? MARK_APPLIED_ARG.slice('--mark-applied='.length)
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean)
		: []
);

function log(msg) {
	console.log(msg);
}

function hashSql(tag) {
	const content = readFileSync(new URL(`../drizzle/${tag}.sql`, import.meta.url), 'utf-8');
	return { content, hash: createHash('sha256').update(content).digest('hex') };
}

function readJournal() {
	const raw = readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf-8');
	const journal = JSON.parse(raw);
	return journal.entries.slice().sort((a, b) => a.idx - b.idx);
}

async function main() {
	const sql = postgres(process.env.DATABASE_URL, { max: 1 });
	const entries = readJournal();

	// Sanity: new journal must be monotonic
	for (let i = 1; i < entries.length; i++) {
		if (entries[i].when <= entries[i - 1].when) {
			throw new Error(
				`Journal is not monotonic at idx ${entries[i].idx} (${entries[i].tag}): ` +
					`when=${entries[i].when} <= previous when=${entries[i - 1].when}`
			);
		}
	}

	// Ensure migrations table exists (matches drizzle-orm pg-core dialect)
	await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
	await sql`
		CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		)
	`;

	const rows = await sql`SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations"`;
	const byHash = new Map(rows.map((r) => [r.hash, r]));

	const plan = [];
	for (const entry of entries) {
		const { hash, content } = hashSql(entry.tag);
		const existing = byHash.get(hash);
		if (existing) {
			const currentWhen = Number(existing.created_at);
			if (currentWhen === entry.when) {
				plan.push({ kind: 'noop', entry, hash });
			} else {
				plan.push({ kind: 'update', entry, hash, from: currentWhen });
			}
		} else if (MARK_APPLIED.has(entry.tag)) {
			plan.push({ kind: 'mark-applied', entry, hash });
		} else {
			plan.push({ kind: 'apply', entry, hash, content });
		}
	}

	// Any recorded hashes no longer referenced by the journal?
	const journalHashes = new Set(plan.map((p) => p.hash));
	const orphans = rows.filter((r) => !journalHashes.has(r.hash));

	log(`Database: ${process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@') ?? '<unset>'}`);
	log(`Journal entries: ${entries.length}`);
	log(`Recorded rows:   ${rows.length}`);
	log('');
	log('Plan:');
	for (const p of plan) {
		const label = String(p.entry.idx).padStart(2, '0');
		switch (p.kind) {
			case 'noop':
				log(`  [ok ] ${label} ${p.entry.tag}`);
				break;
			case 'update':
				log(`  [upd] ${label} ${p.entry.tag}  created_at ${p.from} -> ${p.entry.when}`);
				break;
			case 'apply':
				log(`  [run] ${label} ${p.entry.tag}  (will execute SQL + insert row)`);
				break;
			case 'mark-applied':
				log(`  [mark] ${label} ${p.entry.tag}  (insert row, skip SQL per --mark-applied)`);
				break;
		}
	}
	if (orphans.length) {
		log('');
		log('Warning: these recorded hashes are not present in the journal:');
		for (const o of orphans) {
			log(`  id=${o.id}  hash=${o.hash}  created_at=${o.created_at}`);
		}
	}

	const changes = plan.filter((p) => p.kind !== 'noop');
	if (!changes.length && !orphans.length) {
		log('\nNothing to do.');
		await sql.end();
		return;
	}

	if (DRY_RUN) {
		log('\nDry run. Re-run with --apply to execute.');
		await sql.end();
		return;
	}

	log('\nApplying...');
	await sql.begin(async (tx) => {
		for (const p of plan) {
			if (p.kind === 'noop') continue;
			if (p.kind === 'update') {
				await tx`
					UPDATE "drizzle"."__drizzle_migrations"
					SET created_at = ${p.entry.when}
					WHERE hash = ${p.hash}
				`;
			} else if (p.kind === 'apply') {
				// Mirror drizzle's statement splitting: split on the exact marker.
				const stmts = p.content.split('--> statement-breakpoint');
				for (const stmt of stmts) {
					const trimmed = stmt.trim();
					if (!trimmed) continue;
					await tx.unsafe(stmt);
				}
				await tx`
					INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
					VALUES (${p.hash}, ${p.entry.when})
				`;
			} else if (p.kind === 'mark-applied') {
				await tx`
					INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
					VALUES (${p.hash}, ${p.entry.when})
				`;
			}
		}
	});

	log('Done.');
	await sql.end();
}

main().catch((e) => {
	console.error('Reconciliation failed:', e);
	process.exit(1);
});
