# /review — Review the frontend-side diff

Review the Cursor-lane portion of the current diff.

## Steps

1. Get the diff: `git diff --cached` or `git diff origin/main...HEAD`.
2. Filter to files in Cursor's lane:
   - `src/lib/components/**/*.svelte`
   - `src/routes/**/+page.svelte`, `+layout.svelte`
   - `src/app.css`
   - `tailwind.config.*`
3. For each file, apply the matching rules:
   - Components → `rules/components.mdc` + `rules/svelte5-runes.mdc`
   - Page markup with forms → `rules/forms.mdc`
   - Styling → `rules/tailwind.mdc`
4. Flag any edit that crossed into Claude's lane — those should never have
   been made. Block the review.
5. Run `pnpm check` and report any Svelte-check errors introduced.
6. If a form was added/changed, verify the action exists in the matching
   `+page.server.ts` — reading the server file is allowed for verification.

## Output

- 🚨 Must fix — lane violations, broken types, inaccessible HTML
- ⚠️  Should fix — token violations (raw colors), missing error rendering
- 💡 Consider — extract subcomponent, naming, layout ideas

Verdict: `APPROVE`, `REQUEST_CHANGES`, or `BLOCKED`.
