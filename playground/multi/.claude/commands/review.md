---
description: Review the server-side diff against Compose conventions
argument-hint: "[base-branch]"
---

# /review

Review the Claude-lane portion of the current diff.

## Steps

1. Get the diff: `git diff --cached` or `git diff ${1:-origin/main}...HEAD`.
2. Filter to files in Claude's lane:
   - `src/lib/server/**`
   - `src/hooks.server.ts`
   - `**/+page.server.ts`, `**/+server.ts`
   - `src/lib/types/**`, `src/lib/validation.ts`
   - `drizzle.config.ts`, migrations
3. For each file, check against the matching skill:
   - Route-level files → `skills/sveltekit-routes`
   - DB / query files → `skills/drizzle-queries`
4. If auth / SSE files changed, delegate to `security-reviewer`.
5. If schema changed, confirm a migration is staged and types were updated.
6. Run `pnpm check` and report new errors.
7. If any shared file (`types/`, `validation.ts`) changed, flag it — Cursor's
   next session needs to know.

## Output

- 🚨 Must fix — bugs, missing migrations, security issues
- ⚠️  Should fix — missing workspace scoping, missing Zod validation
- 💡 Consider — naming, structure
- 📤 Handoff — a bulleted list of things Cursor should know about

Verdict: `APPROVE`, `REQUEST_CHANGES`, or `BLOCKED`.
