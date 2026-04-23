# /test-coverage — Analyze coverage gaps in the diff

Identify components whose behavior changed without tests, or whose public
prop surface has grown without matching assertions.

## Steps

1. List files changed since `origin/main`:
   ```
   git diff --name-only origin/main...HEAD -- 'src/**/*.tsx'
   ```
2. For each `.tsx` source file, locate its colocated `.test.tsx`:
   - No test file → mark as uncovered
   - Test file exists → parse which `describe` blocks and `it` clauses reference the exported names
3. For each exported prop added in the diff:
   - Is there a test exercising it? (query by role, pass the prop, assert behavior)
   - If not, add it to the gap list
4. Run coverage against the changed files only:
   ```
   pnpm exec vitest run --coverage --reporter=verbose <files>
   ```
5. Check Storybook: does each new prop have a dedicated story or an argType?

## Output

Markdown table:

| File | State | Missing |
| --- | --- | --- |
| `src/components/Button/Button.tsx` | ⚠ Partial | `iconOnly` prop untested, `Loading` story missing |
| `src/components/Badge/Badge.tsx` | ✓ Covered | — |
| `src/components/Toast/Toast.tsx` | ✗ Uncovered | No `.test.tsx` exists |

Then offer to generate the missing tests and stories. Do not write them
automatically — wait for the user to pick which files to cover.
