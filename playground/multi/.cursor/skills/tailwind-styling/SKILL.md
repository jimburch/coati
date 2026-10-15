---
name: Tailwind + Design Tokens for Compose
description: Teaches Cursor Compose's styling conventions — tokens over raw colors, 4px scale, dark mode via tokens, and `cn()` class merging.
---

# Tailwind + Design Tokens

Compose styling is a thin layer over shadcn-svelte's token system. Follow
the token first, Tailwind second, raw CSS never.

## Color tokens

Use these, not raw palette values:

| Token | Use for |
| --- | --- |
| `bg-background` / `text-foreground` | Default page colors |
| `bg-card` / `text-card-foreground` | Elevated surfaces (cards, modals) |
| `bg-popover` / `text-popover-foreground` | Floating surfaces |
| `bg-muted` / `text-muted-foreground` | De-emphasized content |
| `bg-accent` / `text-accent-foreground` | Hover highlights |
| `bg-primary` / `text-primary-foreground` | Primary buttons, links |
| `bg-destructive` / `text-destructive-foreground` | Danger actions |
| `border-input` / `border-ring` | Borders on inputs and focus rings |

Using `bg-blue-500` or `text-gray-700` is a bug — it breaks dark mode and
violates the design system.

## Spacing

The 4px scale is the whole vocabulary:

- `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px), `gap-12` (48px)
- `p-*` and `m-*` follow the same scale
- For horizontal padding on interactive elements: `px-3` (sm), `px-4` (md), `px-6` (lg)

If a design calls for a value outside this scale, don't compensate with `p-[7px]` — push back on the design or extend the scale properly.

## Typography

shadcn's typography defaults cover most cases:

- `text-sm` — body, most UI
- `text-base` — long-form reading
- `text-lg` — subtitles
- `text-xl` — H2 / page subheadings
- `text-2xl` — H1 / page titles

For Markdown-rendered content, use `prose prose-neutral dark:prose-invert`.

## Dark mode

Dark mode is handled by CSS variables — the tokens above auto-switch. You
rarely need `dark:` classes. If you do, the usual culprit is:

- An image/SVG that needs an inverted variant (`dark:invert`)
- A brand color that isn't tokenized (it should be)
- A shadow that looks harsh in dark mode (use `shadow-sm` or `dark:shadow-md`)

## `cn()` for safe merging

The `cn()` helper from `$lib/cn` combines `clsx` and `tailwind-merge`:

```svelte
<div class={cn(
  'rounded-md border bg-card p-4',  // base
  isActive && 'border-primary bg-primary/10',  // active state
  isDisabled && 'opacity-50 pointer-events-none',  // disabled
  className  // consumer override wins
)} />
```

`tailwind-merge` deduplicates conflicts — a consumer's `p-2` correctly
overrides the base's `p-4`. Don't manually split strings.

## Responsive

Mobile-first. Breakpoints:

- `sm:` (640px) — large phones / small tablets
- `md:` (768px) — tablets / small laptops
- `lg:` (1024px) — laptops
- `xl:` (1280px) — desktops

```svelte
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {#each notes as note (note.id)}
    <NoteCard {note} />
  {/each}
</div>
```

Atlas-style: design for 375px width first; add breakpoint modifiers only
where the design actually changes.

## Animations

- `transition-colors`, `transition-opacity`, `transition-transform` for common cases
- `duration-150` (fast), `duration-200` (default), `duration-300` (slow)
- `ease-out` for entering, `ease-in` for leaving
- Respect `motion-safe:` for anything nontrivial

## Don't

- Don't use raw color palette utilities (`bg-red-500`)
- Don't use `@apply` — utilities in markup only
- Don't use arbitrary values (`h-[73px]`, `gap-[13px]`) — stay on the scale
- Don't add new CSS variables without updating the design token spec
- Don't mix Tailwind and inline `style={...}` — pick one per component
