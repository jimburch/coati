---
description: Analyze test coverage gaps for files changed on the current branch
---

# /test-coverage

Identify test gaps in the diff between `HEAD` and `origin/main`.

## Steps

1. Get the list of changed source files: `git diff --name-only origin/main...HEAD -- 'src/**/*.ts' 'src/**/*.svelte'`.
2. For each source file:
   - Check if a colocated `*.test.ts` exists.
   - If yes, scan it: are all exported functions covered? Are happy-path AND error-path cases covered?
   - If no, propose the test cases the file needs.
3. For changes under `src/routes/`, check if an e2e test under `e2e/` exercises the route.
4. Run `pnpm exec vitest run --coverage --reporter=verbose` against the changed files only.
5. Report one of three coverage states per file:
   - ✓ Covered — all functions have happy + error tests
   - ⚠ Partial — some paths missing (list them)
   - ✗ Uncovered — no tests at all

## Output

Produce a markdown table:

| File | State | Missing cases |
|------|-------|---------------|

Then offer to write the missing tests. Do not write them automatically — wait
for the user to pick which files to cover.
