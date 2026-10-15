# /new-component — Scaffold a new Svelte component

Generate a new component under `src/lib/components/` following Compose
conventions.

## Inputs

- `$1` — component name in PascalCase (e.g., `NoteCard`, `ShareDialog`)
- `$2` (optional) — subdirectory (e.g., `editor` to create `components/editor/`)

## Steps

1. Determine path:
   - If `$2` given: `src/lib/components/$2/$1.svelte`
   - Otherwise: `src/lib/components/$1.svelte`
2. Check collision — refuse to overwrite.
3. Scaffold the component with:
   - `<script lang="ts">` block with explicit `Props` interface
   - `$props()` destructure with default values inline
   - `cn()` merging of `class` prop
   - Semantic root element
4. For interactive components, add callback props named `on<event>`.
5. Respect the lane boundary — never import from `$lib/server/*`.
6. Run `pnpm check` to confirm the component type-checks.
7. Take a Playwright screenshot:
   ```
   npx playwright screenshot --viewport-size=1280,720 \
     http://localhost:5173/sandbox/$1 \
     screenshots/$1-desktop.png
   ```
   (Requires a sandbox route that renders the component — if none exists,
   skip the screenshot and note it in the output.)

## Template

```svelte
<script lang="ts">
  import { cn } from '$lib/cn';

  interface Props {
    class?: string;
    // add your props here
  }

  let { class: className = '' }: Props = $props();
</script>

<div class={cn('rounded-md', className)}>
  <!-- content -->
</div>
```

## Output

- File created at: `<path>`
- Screenshot at: `<screenshot path>` (or "skipped — no sandbox route")
- Next steps: re-export from `src/lib/components/index.ts` if it's a public component
