# Migration Journal Reconciliation

One-time operational runbook for repairing `drizzle.__drizzle_migrations` after
the broken `_journal.json` timestamps were fixed.

## Background

Migration `0015_setup_slug_redirects` was generated with `when=1773811200000`
(2026-03-19). Drizzle's migrator compares each journal entry's `when` against
the latest `created_at` in `__drizzle_migrations` and only applies entries with
a strictly greater timestamp. Once 0015 was recorded, every later migration
with a normal 2025 `when` — most notably `0016_drop_placement` — was silently
skipped. `drizzle-kit migrate` kept reporting success.

`_journal.json` has now been rewritten so every `when` increases
monotonically with `idx`. Hashes in `__drizzle_migrations` do not change
(they are sha256 of the SQL file contents, not the journal), so existing rows
stay matchable. Each environment needs a one-time reconciliation to:

1. Update `created_at` on rows that survived so they match the new `when`.
2. Apply any migrations that were silently skipped.

After reconciliation, `pnpm db:migrate` is a no-op and stays healthy for
future migrations.

## Tool

`scripts/reconcile-migration-tracking.mjs` reads the journal, hashes each SQL
file, and prints a per-entry plan. It writes nothing without `--apply`.

```
node scripts/reconcile-migration-tracking.mjs                # dry run
node scripts/reconcile-migration-tracking.mjs --apply        # commit changes
node scripts/reconcile-migration-tracking.mjs --apply \
    --mark-applied=<tag1,tag2,...>                           # skip SQL for listed tags
```

`--mark-applied` records the migration as applied without executing its SQL —
used when the schema was synced via `drizzle-kit push` or a manual patch and
the SQL would otherwise fail (e.g., `ADD COLUMN` for a column that already
exists).

The script runs inside a single transaction. `DATABASE_URL` selects the
target database.

## Running reconciliation

### Step 1: audit the target DB

Before applying, check what is actually present so you know whether to let
the script run each missing migration's SQL or to use `--mark-applied`.

```sql
-- Which hashes are already tracked?
SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at;

-- Is each post-0015 change reflected in the schema?
SELECT column_name FROM information_schema.columns
WHERE table_name = 'setups'
  AND column_name IN ('display', 'placement', 'readme', 'featured_at');
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('is_beta_approved', 'last_login_at', 'name', 'location');
SELECT to_regclass('public.feedback_submissions'),
       to_regclass('public.setup_reports'),
       to_regclass('public.setup_slug_redirects'),
       to_regclass('public.trending_setups_mv');
```

### Step 2: dry run

```
DATABASE_URL=<target> node scripts/reconcile-migration-tracking.mjs
```

Read the plan carefully. Expected actions:

- `[ok ]` — hash matches and `created_at` already equals the new `when`. No-op.
- `[upd]` — hash matches, `created_at` changes to the new `when`.
- `[run]` — hash not recorded; script will execute the SQL and insert the row.
- `[mark]` — hash not recorded; script will insert the row without running SQL
  (only when `--mark-applied` names the tag).

If any `[run]` entry would attempt SQL whose effect is already present in the
schema (e.g., the table already exists), add it to `--mark-applied` instead.

### Step 3: apply

```
DATABASE_URL=<target> node scripts/reconcile-migration-tracking.mjs --apply [--mark-applied=...]
```

### Step 4: verify

```
DATABASE_URL=<target> pnpm exec drizzle-kit migrate
```

Should report `migrations applied successfully!` with no new rows in
`__drizzle_migrations`.

## Per-environment notes

### Local dev (`coati_dev`)

Schema was out-of-sync with tracking due to prior `drizzle-kit push` usage.
All migrations through 0015 were reflected in the schema; 0014's `placement`
column was still present. Reconciliation command used:

```
node scripts/reconcile-migration-tracking.mjs --apply \
  --mark-applied=0007_add_beta_and_login_tracking,0008_add_feedback_submissions,0009_add_setup_reports,0010_missing_indexes,0011_trending_materialized_view,0012_drop_version_add_readme,0013_add_featured_at,0014_path_based_manifest
```

### Test DB (`coati_test`)

Reset to clean slate — no persistent data:

```
DATABASE_URL=postgres://coati:coati@localhost:5433/coati_test npx tsx scripts/reset-db.ts
DATABASE_URL=postgres://coati:coati@localhost:5433/coati_test pnpm exec drizzle-kit migrate
```

### Staging (`develop.coati.sh`)

Expected state: migrations 0000–0015 tracked in `__drizzle_migrations`; 0016
silently skipped; 0017 not yet deployed. Run the audit queries first, then:

```
DATABASE_URL=<staging> node scripts/reconcile-migration-tracking.mjs           # dry run
DATABASE_URL=<staging> node scripts/reconcile-migration-tracking.mjs --apply   # commit
```

No `--mark-applied` should be needed — let the script execute the 0016 and
0017 SQL, which is a safe `DROP COLUMN placement` and a safe
`ADD COLUMN display` plus a regenerated `search_vector`. Take a snapshot
beforehand if possible.

### Production

Expected state matches staging minus 0017 (not yet on `main`). Apply the
same procedure against the production database on a planned window. Take a
snapshot, run the audit queries, then dry-run, then `--apply`.

## After reconciliation

Once every environment has been reconciled, this doc and the
`scripts/reconcile-migration-tracking.mjs` script can be removed — they are
one-time repair tooling, not ongoing workflow.
