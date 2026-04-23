---
description: Scaffold a route's backend (load + actions + endpoints) and write a Cursor handoff for the UI
argument-hint: "<route-path>"
---

# /add-route

Scaffold the backend side of a new SvelteKit route and produce a handoff note
for Cursor to build the UI.

## Inputs

- `$1` — route path, e.g. `/notes/[id]/share`

## Steps

1. Validate the path is a valid SvelteKit route.
2. Determine whether the route needs:
   - A `+page.server.ts` load function
   - Form actions
   - A `+server.ts` endpoint (for programmatic access)
3. Check if the path requires new query functions in
   `src/lib/server/queries/` — scaffold those first.
4. Write the `+page.server.ts` (if needed):
   - `load` function with auth check and workspace scoping
   - Form actions for the operations the UI will likely need
   - Zod-validated inputs from `src/lib/validation.ts` (add new schemas there)
5. If the route needs JSON endpoints, write `+server.ts`.
6. Do NOT write `+page.svelte`. That's Cursor's lane.
7. Delegate to `handoff-writer` subagent to produce the Cursor handoff note.
8. Run `pnpm check` and fix any issues.

## Output

Print the handoff note at the end. The user will hand it to Cursor directly
or commit it to the PR body.
