---
name: shadcn-svelte Component Patterns
description: Teaches Claude how Linkly uses shadcn-svelte primitives and when to wrap vs. extend them.
---

# shadcn-svelte Component Patterns

Linkly uses shadcn-svelte primitives under `src/lib/components/ui/`. These are
vendored — edit them directly when extending. Application components live in
`src/lib/components/` (peer directory, not nested).

## Adding a primitive

Use the CLI:

```bash
pnpm dlx shadcn-svelte@latest add dialog
```

This writes files to `src/lib/components/ui/dialog/`. Commit them. **Do not
re-run `add` for a component you already have** — it overwrites customizations.

## Wrapping vs. extending

- **Wrap** when composing primitives into an app-specific component
  (e.g., `LinkCard.svelte` uses `Card` + `Button`). Wrappers live in
  `src/lib/components/`.
- **Extend** the primitive directly only when the variant belongs to every
  usage site (e.g., adding a `subtle` button variant).

```svelte
<!-- src/lib/components/LinkCard.svelte — a wrapper -->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { Link } from '$lib/server/queries/links';

	interface Props {
		link: Link;
	}

	const { link }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{link.shortCode}</Card.Title>
		<Card.Description>{link.destinationUrl}</Card.Description>
	</Card.Header>
	<Card.Footer>
		<Button variant="outline" href="/dashboard/links/{link.id}">Edit</Button>
	</Card.Footer>
</Card.Root>
```

## Styling

- Use Tailwind utilities directly — no CSS modules
- Reach for design tokens (`bg-background`, `text-muted-foreground`) over raw colors
- Spacing scale: prefer `gap-*` on flex/grid over `space-x-*`
- Never set `color` or `background-color` in a `<style>` block; use classes

## Forms

Use `formsnap` + `sveltekit-superforms` for any form with validation feedback.
Trivial forms (a single submit button, no fields) can use a plain `<form>`.

## Dark mode

The `ModeSwitcher` component reads and writes `mode-watcher`'s store. All
shadcn tokens auto-adapt — don't hand-write light/dark variants on app code.

## Don't

- Don't install Bits UI or Melt UI directly — the shadcn-svelte primitives already use them
- Don't add Headless UI, Radix, or Material components; we're shadcn-svelte only
- Don't override the `cn()` helper in `$lib/utils.ts`
- Don't hard-code widths on Card/Dialog primitives — use Tailwind responsive classes
