---
description: Review the diff against Kite conventions and run the standard checks
args: [base-branch]
---

# /review

Review staged changes (or the diff against `$1`, defaulting to `origin/main`).

## Steps

1. Fetch the diff:
   ```
   git diff ${1:-origin/main}...HEAD
   ```
2. Classify each changed file and apply the matching checklist.
3. Run the quality gates:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test:unit --changed`
4. Produce a grouped report.

## Checklists

### Components (`app/components/**/*.vue`)

- `<script setup lang="ts">` — not Options API
- `defineProps` uses explicit TypeScript interface, not runtime object
- `defineEmits` types all emitted events
- No `any` types
- No direct DOM access (`document.*`) — use template refs or `@vueuse/core`
- `v-for` always has `:key`, never index as key when items reorder
- `v-if` and `v-for` never on the same element — wrap in `<template v-for>` instead

### Composables (`app/composables/**/*.ts`)

- Named `useXxx`
- Explicit return type interface
- No side effects at module level
- Lifecycle hooks (`onMounted` etc.) documented if used
- Returns an object of refs, not unwrapped values

### Stores (`app/stores/**/*.ts`)

- Setup syntax, not Options
- No auth tokens in persisted state
- Each action is tested
- Getters are `computed`, not plain functions

### Pages (`app/pages/**/*.vue`)

- `definePageMeta` sets layout and middleware
- Authenticated pages depend on `auth` middleware
- Workspace pages depend on `workspace` middleware AND use `[workspaceId]` param
- Data fetching via `useFetch` or the API client — not raw `fetch`
- Loading + error states are handled in the template, not just happy path

### Tests

- Colocated with source
- Every bug fix has a regression test
- No `it.only` or `describe.only`
- Uses `@testing-library/vue` queries, not `wrapper.find('.class')`

## Output

| Severity | Count | Examples |
| --- | --- | --- |
| 🚨 Must fix | N | list with file:line |
| ⚠️  Should fix | N | |
| 💡 Consider | N | |

End with `APPROVE`, `REQUEST_CHANGES`, or `BLOCKED`.
