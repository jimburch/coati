# /refactor — Extract a subcomponent

Use when a component file has grown past 150 lines and a cohesive subtree
should become its own component.

## Steps

1. Identify the subtree to extract. It should have:
   - A clear single responsibility
   - A minimal prop surface (≤ 5 props)
   - No refs reaching into the parent component
2. Propose a name. Check `src/components/` for collisions.
3. Create `src/components/<Name>/` with the standard file set
   (see `/new-component` for the template).
4. Move the JSX, hooks, and local state used only by the subtree.
5. Replace the original location with `<NewComponent {...} />`.
6. Update the parent's test file to stub or interact with the new component via RTL queries.
7. Run `pnpm lint && pnpm check && pnpm test:unit`. Iterate until green.

## When to extract

Extract when:
- A cohesive subtree has its own state
- The subtree is tested in isolation already (test file mentions it)
- The subtree would be reused by a sibling
- The parent file exceeds 150 lines

Do NOT extract when:
- The subtree exists only once and sharing state with the parent is constant
- The prop surface would be > 8 props (coupling too high)
- Extraction requires lifting state that currently lives correctly in the parent

## Do not

- Do not bundle unrelated cleanups into the refactor commit
- Do not rename props while extracting — keep them identical to minimize diff
- Do not break the public API — if the extracted component needs to be exported, append to `src/index.ts`
