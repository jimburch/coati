# /prisma-migration — Plan and write a safe Prisma migration

Use this prompt to plan a schema change. Delegate to the `migrator` agent for
execution once the plan is approved.

## Inputs

- Description of the change (e.g., "add a `billingCycle` enum to `workspaces`")
- Affected models
- Whether the change is deploy-blocking or can wait for a maintenance window

## Steps

### 1. Inspect current shape

Read `prisma/schema.prisma` and summarize the affected models. Note:
- Column count
- Indexes and unique constraints
- Relations (cascade? restrict?)
- Estimated row count (check `docs/DATA-SIZES.md` or ask)

### 2. Categorize the change

- **Safe, single phase:** add nullable column; add table; add index concurrently; add enum value (Postgres 14+)
- **Risky, three phase:** add non-nullable column; drop column; rename column; change type; tighten constraint
- **Destructive, maintenance window:** drop table; drop FK used by running queries; invert a cascade

### 3. Write the plan

Output a markdown plan in this shape:

```
## Migration: <title>

**Category:** safe | risky | destructive
**Phases:** 1 | 3
**Estimated downtime:** none | seconds | maintenance window
**Affected tables:** expenses (~50M rows), workspaces (~10k rows)

### Phase 1 — additive
- [ ] Prisma schema change: …
- [ ] Generated SQL review
- [ ] Deploy and bake for 24 hours

### Application changes (between Phase 1 and 2)
- [ ] Dual-write to old and new columns
- [ ] Dual-read (prefer new, fall back to old)
- [ ] Deploy and monitor

### Phase 2 — backfill
- [ ] Script at `scripts/backfill/NNN-backfill-<name>.ts`
- [ ] Run in batches of 10k, sleep 100ms between
- [ ] Verify counts match

### Phase 3 — cleanup
- [ ] Remove dual-write/read code
- [ ] Drop old column
- [ ] Deploy
```

### 4. Draft the Phase 1 migration

`pnpm db:migrate:dev --name <kebab-name>`. Review the generated SQL for:

- `ALTER TABLE ... ADD COLUMN NOT NULL` without `DEFAULT` → reject
- `CREATE INDEX` without `CONCURRENTLY` on a table > 1M rows → change it
- `ALTER TABLE ... DROP COLUMN` outside a three-phase plan → reject
- Implicit cascade changes → flag

### 5. Require explicit sign-off

Never apply a risky or destructive migration without user approval. Print the
generated SQL and ask for confirmation. Even in auto mode.

## Do not

- Do not collapse phases to save effort — small tables today become large tomorrow
- Do not use `prisma db push` — always use migrations
- Do not edit an already-applied migration file
- Do not rename a column by dropping + adding — use the rename workflow and a temporary dual-read
