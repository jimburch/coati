---
description: Identify test gaps in the diff and propose tests to add
---

# /test-coverage

Find source files changed in the current branch without matching tests.

## Steps

1. List changed TS/Vue files:
   ```
   git diff --name-only origin/main...HEAD -- 'app/**/*.{ts,vue}'
   ```
2. For each:
   - Check for a colocated `*.test.ts` or `*.test.vue`
   - If missing, mark as uncovered
   - If present, parse which exported names appear in the test file
3. Run coverage only on changed files:
   ```
   pnpm exec vitest run --coverage --changed
   ```
4. Check that every new `defineProps` field has at least one test asserting
   behavior when it's set to a non-default value.
5. Check that every new Pinia action is exercised in the store test.
6. For new composables, verify at least:
   - Initial state test
   - One test per exposed function
   - Async composables: pending/error transitions

## Output

```
File                                  State     Missing
app/stores/sites.ts                   ⚠ Partial  select() action untested
app/composables/useDateRange.ts       ✗ Uncovered  no test file
app/components/SiteCard.vue           ✓ Covered   —
```

Offer to generate missing tests. Do not write them automatically.
