# /review — Review a Ledger PR

Review the staged diff (or the PR number provided as an argument) against the
conventions in `.github/copilot-instructions.md`.

## Scope

1. Fetch the diff:
   - If no argument, run `git diff --cached`.
   - If a PR number, run `gh pr diff $1`.
2. Identify the files changed and classify them:
   - `src/server/api/routers/*` → apply the tRPC checklist
   - `src/server/**/prisma*` or `prisma/schema.prisma` → apply the Prisma checklist
   - `src/app/**/*.tsx` → apply the RSC/client boundary checklist
   - `*.test.ts` → apply the testing checklist

## tRPC checklist

- Every new procedure uses `protectedProcedure` or `workspaceProcedure` unless it is a public marketing query
- Every mutation has Zod input validation
- Every procedure that reads workspace-owned data filters by `workspaceId`
- Error paths throw `TRPCError` with a specific code
- The output is inferred — no `as` casts narrowing the return type

## Prisma checklist

- New fields are nullable OR have a default; no `NOT NULL` without default on existing tables
- Every workspace-owned table has an index on `workspaceId`
- No `$queryRawUnsafe` anywhere
- Relations use `@relation(onDelete: ...)` explicitly
- Migrations do not include destructive changes without a three-phase plan

## RSC / client boundary checklist

- `'use client'` is on the deepest component that actually needs it
- Server-only imports (`~/server/*`, `~/lib/prisma`) are not reachable from a client component tree
- No `async` Client Components
- Server Components do not call `fetch('/api/trpc/...')` — use `createCaller()` instead
- `useState`, `useEffect`, event handlers only in Client Components

## Testing checklist

- New behavior has tests
- Bug fixes have a regression test that fails on the old code
- Test names read as sentences starting with "should"
- Tests use `toEqual` over `toBe` for objects and arrays

## Output

Produce a markdown report with findings grouped by severity:

- **🚨 Must fix** — security, data-loss, or broken behavior
- **⚠️  Should fix** — convention violations, missing tests
- **💡 Consider** — style, naming, future-proofing

End with a one-line verdict: `APPROVE`, `REQUEST_CHANGES`, or `BLOCKED`.
