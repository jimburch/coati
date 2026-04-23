# /wire-form — Wire a Svelte form to an existing form action

Given a route path and an action name, write the `<form>` + `use:enhance`
integration in the corresponding `+page.svelte`.

## Inputs

- `$1` — route path (e.g., `/notes/[id]`)
- `$2` — action name (e.g., `archive`, `update`, `share`)

## Steps

1. Open `src/routes/<$1>/+page.server.ts` (read-only — Claude's lane).
2. Find the action definition. Note:
   - Expected form fields (from the Zod schema)
   - Return shape on success
   - `fail()` shape on error
3. If the schema is imported from `src/lib/validation.ts`, read that file to
   confirm the exact field names and types.
4. Open `src/routes/<$1>/+page.svelte`. Check if a form is already wired.
5. Add a new `<form method="POST" action="?/$2" use:enhance>` block.
6. Add inputs for each expected field, named to match the Zod schema.
7. Surface errors via the `form` prop.
8. Add loading state on the submit button.
9. Run `pnpm check` to confirm types flow through.
10. Test in the browser via Playwright or manually:
    - Submit the happy path
    - Submit with an invalid field — verify error rendering

## Output

- File updated: `src/routes/<$1>/+page.svelte`
- Form action used: `?/$2`
- Expected inputs: list of fields with types
- Error cases handled: list of `form.errors.*` keys rendered

## When to decline

If the action doesn't exist in `+page.server.ts`, STOP. Do not edit the
server file. Ask the user to hand off to Claude first.
