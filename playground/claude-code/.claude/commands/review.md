---
description: Review staged changes against project conventions
argument-hint: "[base-branch]"
---

# /review

Review staged changes (or the diff against `$1` if provided, otherwise
`origin/main`) against the conventions in `CLAUDE.md` and the skills under
`.claude/skills/`.

## Steps

1. Run `git diff --cached` (or `git diff $1...HEAD` if `$1` was passed).
2. For each changed file, check against the matching skill:
   - Changes under `src/routes/` → `skills/sveltekit-routes`
   - Changes touching `src/lib/server/db/` → `skills/drizzle-queries`
   - Changes under `src/lib/server/auth/` → `skills/lucia-auth`
   - Changes under `src/lib/components/ui/` → `skills/shadcn-svelte`
3. Run `pnpm check` and report any new type errors introduced by the diff.
4. Run `pnpm exec vitest related $(git diff --cached --name-only --diff-filter=ACM) --run` and report test failures.
5. If `src/lib/server/db/schema.ts` changed, confirm a matching migration is staged.
6. If any file under `src/routes/api/` or `src/lib/server/auth/` changed, delegate to the `security-reviewer` subagent for a second pass.

## Output

Summarize findings grouped by severity:

- **Must fix** — bugs, type errors, missing migrations, security issues
- **Should fix** — convention violations, missing tests
- **Consider** — nits, naming suggestions

End with a single-line verdict: `APPROVE`, `REQUEST_CHANGES`, or `BLOCKED`.
