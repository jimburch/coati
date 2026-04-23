# /review — Review staged changes against Atlas conventions

## Steps

1. `git diff --cached` and list the files changed.
2. For each changed file, route to the matching rule set:
   - `src/components/**/*.tsx` → `react-components.mdc`
   - `src/**/*.stories.tsx` → `storybook.mdc`
   - `src/**/*.test.tsx` → `testing.mdc`
   - `src/lib/cva.ts` or any component with variants → `tailwind.mdc`
   - Any interactive component → `accessibility.mdc`
3. Check for new component files without:
   - A `.stories.tsx` sibling (block)
   - A `.test.tsx` sibling (block)
   - An entry in `src/index.ts` (block)
4. Run `pnpm lint` and `pnpm check` and report any new errors.
5. Run `pnpm test:unit --run` for the changed test files. Report failures.

## Output

Group findings by severity:

- **🚨 Must fix** — violations of mandatory rules (missing story, missing a11y, type errors)
- **⚠️  Should fix** — convention violations (variant naming, CVA usage)
- **💡 Consider** — suggestions (extract subcomponent, add edge-case story)

Finish with a Chromatic reminder if any `.stories.tsx` file changed:
> `📸 Story changes detected — run \`pnpm chromatic\` and review the diff before merging.`

Verdict: `APPROVE`, `REQUEST_CHANGES`, or `BLOCKED`.
