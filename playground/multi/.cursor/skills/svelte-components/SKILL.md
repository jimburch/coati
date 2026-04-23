---
name: Svelte 5 Component Authoring
description: Teaches Cursor how to build Compose components with runes, shadcn-svelte composition, and clean prop APIs.
---

# Svelte 5 Component Authoring

## Full example

```svelte
<script lang="ts">
  import { cn } from '$lib/cn';
  import type { Note } from '$lib/types';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  interface Props {
    note: Note;
    class?: string;
    onarchive?: (id: string) => void;
    ondelete?: (id: string) => void;
  }

  let { note, class: className = '', onarchive, ondelete }: Props = $props();

  let expanded = $state(false);
  let preview = $derived(expanded ? note.body : note.body.slice(0, 200));
  let isArchived = $derived(note.archivedAt !== null);
</script>

<article
  class={cn(
    'group relative rounded-md border p-4 transition-colors',
    'hover:border-ring',
    isArchived && 'opacity-60',
    className
  )}
>
  <header class="flex items-start justify-between gap-4">
    <h3 class="font-medium">{note.title}</h3>
    {#if isArchived}
      <Badge variant="secondary">Archived</Badge>
    {/if}
  </header>

  <p class="text-muted-foreground mt-2 text-sm">
    {preview}
    {#if note.body.length > 200}
      <button
        type="button"
        class="text-primary ml-1 underline"
        onclick={() => (expanded = !expanded)}
      >
        {expanded ? 'show less' : 'show more'}
      </button>
    {/if}
  </p>

  <footer class="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
    {#if onarchive && !isArchived}
      <Button variant="ghost" size="sm" onclick={() => onarchive?.(note.id)}>Archive</Button>
    {/if}
    {#if ondelete}
      <Button variant="ghost" size="sm" onclick={() => ondelete?.(note.id)}>Delete</Button>
    {/if}
  </footer>
</article>
```

## Key patterns

### Callback props

Named `on<event>` (all lowercase). The optional `?.` handles consumers who
don't wire the callback:

```svelte
onclick={() => onarchive?.(note.id)}
```

### Class merging with `cn()`

Always accept `class` (renamed to `className` in destructure to avoid the
reserved word):

```svelte
let { class: className = '' }: Props = $props();
<div class={cn('default-classes', conditionalClass && 'extra', className)} />
```

### State derivation

Prefer `$derived` over `$effect` for computed values:

```svelte
let preview = $derived(expanded ? note.body : note.body.slice(0, 200));
// not: let preview = $state(''); $effect(() => { preview = ... });
```

### Conditional rendering

```svelte
{#if isArchived}
  <Badge variant="secondary">Archived</Badge>
{/if}
```

Put `v-if`-style conditionals around the smallest unit. Wrap with
`{#if}...{:else}...{/if}` for mutually exclusive branches.

### Lists

```svelte
{#each notes as note (note.id)}
  <NoteCard {note} onarchive={handleArchive} />
{/each}
```

Always provide a key (`(note.id)`). Using array index breaks when items reorder.

## Composing shadcn-svelte

Compound primitives export their parts; consumer composes them:

```svelte
<script lang="ts">
  import * as Dialog from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';

  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger asChild>
    <Button variant="outline">Share note</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Title>Share this note</Dialog.Title>
    <Dialog.Description>Anyone with the link can view.</Dialog.Description>
    <!-- form goes here -->
  </Dialog.Content>
</Dialog.Root>
```

## Accessibility

- Every interactive element is a `<button>`, `<a>`, or a shadcn primitive — never a clickable `<div>`
- Every form input has a visible `<label>` via `<Label>` from `$lib/components/ui/label`
- Icon-only buttons have `aria-label`
- Focus rings are visible — shadcn primitives handle this; don't override with `outline-none`

## Don't

- Don't import from `$lib/server/*`
- Don't call `fetch()` directly — use `use:enhance` or `applyAction`
- Don't write tags in `<style>` blocks unless a Tailwind utility genuinely can't express it
- Don't reach into shadcn primitives' internals — compose, don't modify
