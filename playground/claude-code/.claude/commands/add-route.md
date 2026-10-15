---
description: Scaffold a new SvelteKit route with the right boilerplate for its category
argument-hint: "<route-path> [marketing|app|api]"
---

# /add-route

Delegate to the `route-writer` subagent to scaffold a new route.

## Arguments

- `$1` — route path, e.g. `/dashboard/billing` or `/api/v1/workspaces`
- `$2` — category: `marketing` (SSR, no auth), `app` (SPA, authenticated), `api` (JSON, optional API key)

If `$2` is omitted, infer from `$1`:
- Starts with `/api/` → `api`
- Starts with `/dashboard`, `/settings`, `/team` → `app`
- Everything else → ask the user

## Steps

1. Validate `$1` is a valid SvelteKit route path (kebab-case, no trailing slash).
2. Check whether the path already exists — refuse to overwrite.
3. Invoke the `route-writer` subagent with the path and category.
4. After scaffolding, run `pnpm check` to confirm the new files type-check.
5. Print a list of next steps (e.g., "add a nav link", "register in sidebar").
