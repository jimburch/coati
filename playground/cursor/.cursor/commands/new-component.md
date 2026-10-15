# /new-component — Scaffold a new Atlas UI component

Generate a complete component package: `Component.tsx`, `Component.stories.tsx`,
`Component.test.tsx`, and `index.ts`.

## Inputs

- `$1` — component name in PascalCase (e.g., `Badge`, `Tooltip`)
- `$2` — category for Storybook title (e.g., `Actions`, `Feedback`, `Forms`)

## Steps

1. Create `src/components/$1/`.
2. Write `$1.tsx` following the template in `.cursor/rules/react-components.mdc`:
   - `forwardRef` wrapping the root element
   - `cva` variants (if applicable — ask if not obvious)
   - `cn()` merging `className`
   - Explicit `ButtonProps`-style interface extending the correct DOM props
   - `displayName` set
3. Write `$1.stories.tsx` with these stories:
   - `Default` — canonical usage
   - `AllVariants` — if the component has variants, render them side-by-side
   - `Disabled` / `Loading` — if applicable
   - `WithInteraction` — a `play` function exercising the primary user flow
4. Write `$1.test.tsx` with baseline tests:
   - Renders the label or accessible name
   - Forwards the ref
   - Merges `className`
   - Handles the primary interaction (click, change, keydown)
   - One accessibility assertion (`getByRole` with name works)
5. Write `index.ts` re-exporting `$1` and `$1Props`.
6. Append the re-export to `src/index.ts` in alphabetical order.
7. Run `pnpm lint && pnpm check && pnpm test:unit -- --run $1`. Iterate until green.
8. Open Storybook (`pnpm storybook`) and verify the component renders in
   each variant. Take a screenshot and save it to `screenshots/$1-default.png`
   for the user to review.

## Output

Print a summary table:

| File | Status |
| --- | --- |
| `src/components/$1/$1.tsx` | ✓ created |
| `src/components/$1/$1.stories.tsx` | ✓ created (4 stories) |
| `src/components/$1/$1.test.tsx` | ✓ created (5 tests) |
| `src/components/$1/index.ts` | ✓ created |
| `src/index.ts` | ✓ updated |

Followed by next steps:
- "Add Chromatic baseline: `pnpm chromatic`"
- "Add to the design-tokens spec if new tokens were introduced"
