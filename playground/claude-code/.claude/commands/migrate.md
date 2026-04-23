---
description: Generate and apply a Drizzle migration safely
argument-hint: "<migration-name>"
---

# /migrate

Delegate to the `drizzle-migrator` subagent.

## Steps

1. Confirm the git working tree is clean under `src/lib/server/db/` — refuse if there are unrelated changes staged.
2. Invoke the `drizzle-migrator` subagent with `$1` as the proposed migration name.
3. Run `pnpm db:generate` when the subagent approves.
4. Open the generated SQL file and print it back to the user.
5. Prompt the user to apply with `pnpm db:migrate` themselves — do NOT run it automatically.

## Safety

- Never run `db:migrate` without explicit user confirmation.
- Never run `db:push`.
- If the generated SQL contains `DROP COLUMN`, `DROP TABLE`, or `ALTER TYPE`, stop and require a three-phase migration plan before proceeding.
