---
description: Generate and apply a Drizzle migration via the drizzle-migrator subagent
argument-hint: "<migration-name>"
---

# /migrate

Delegate to the `drizzle-migrator` subagent to plan and generate a migration.

## Steps

1. Confirm the git working tree has no unrelated changes staged under
   `src/lib/server/db/` — refuse if so.
2. Invoke `drizzle-migrator` with `$1` as the proposed migration name.
3. When the subagent produces a plan, print it to the user and wait for approval.
4. On approval, run `pnpm db:generate` — the subagent will review the output.
5. Print the generated SQL back to the user.
6. Prompt the user to apply with `pnpm db:migrate` themselves. Do NOT run
   `pnpm db:migrate` automatically.
7. If the migration adds fields that UI will want (e.g., `archivedAt`), delegate
   to `handoff-writer` to generate a Cursor handoff note.
