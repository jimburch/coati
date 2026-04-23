# /test-generation — Generate Vitest tests for a file

Given a source file, generate a comprehensive Vitest test file following
Ledger's testing patterns.

## Inputs

- `$1` — path to the source file (e.g., `src/server/api/routers/expenses.ts`)
- `$2` (optional) — specific function name to focus on

## Process

1. Read the source file. For each exported function or procedure, document:
   - Signature (inputs, outputs)
   - Side effects (database writes, external calls)
   - Error cases (what can throw?)
   - Edge cases (empty inputs, boundary values, concurrent access)
2. If the file is a tRPC router, include:
   - Happy path per procedure
   - Unauthorized access test (no session)
   - Wrong-workspace access test (user in workspace A calling for workspace B)
   - Invalid input test (Zod validation fails)
3. If the file is a Prisma query helper, include:
   - Workspace scoping test (rows from other workspaces never leak)
   - Empty-result test
   - Transaction-boundary test if relevant
4. Write the test file at the colocated path (`foo.ts` → `foo.test.ts`).
5. Use the test helpers already in place:
   - `createTestCaller({ userId, workspaceId })` for tRPC invocation
   - `resetDatabase()` + `seedExpense()` / `seedWorkspace()` for state
6. Run `pnpm exec vitest related $1 --run`. Iterate until green.

## Naming

Tests read as sentences starting with "should":
- `"should return paginated expenses for the current workspace"`
- `"should throw UNAUTHORIZED when no session exists"`
- `"should not leak expenses from other workspaces"`

## Do not

- Do not mock Prisma. Use the test database.
- Do not test implementation details (private helpers, internal state)
- Do not test Zod parsing itself — trust Zod
- Do not add `it.only` or `describe.only` — reviewers will bounce the PR
