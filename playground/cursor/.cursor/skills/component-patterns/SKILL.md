---
name: Atlas Component Patterns
description: Teaches Cursor how to build a shadcn-style primitive for Atlas UI with Radix behavior, CVA variants, and a clean public surface.
---

# Atlas Component Patterns

Atlas UI components follow a consistent recipe: **Radix for behavior, CVA for
styles, forwardRef for interop, a small explicit prop interface on top.**

## Anatomy

```tsx
// src/components/Popover/Popover.tsx
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import { cn } from '~/lib/cn';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export interface PopoverContentProps
  extends ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

export const PopoverContent = forwardRef<
  ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = 'center', sideOffset = 8, ...rest }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...rest}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';
```

## Compound components

When a component has multiple cooperating parts (Dialog, Popover, Select),
export each part separately from the same file. The consumer composes them:

```tsx
<Popover>
  <PopoverTrigger asChild><Button>Open</Button></PopoverTrigger>
  <PopoverContent>…</PopoverContent>
</Popover>
```

Do not ship a single-prop API like `<Popover content={...} />` — it cripples
composition.

## `asChild` pattern

Many Atlas triggers accept `asChild`, which forwards props to the child via
Radix's `Slot`. Consumers can swap the default element:

```tsx
<Tooltip.Trigger asChild>
  <Button variant="ghost" size="sm">?</Button>
</Tooltip.Trigger>
```

Never use `asChild` on more than one child — it only merges one set of props.

## Variants via CVA

Variants belong on the *styled* layer, not the *behavioral* layer. The Radix
primitive stays behavior-only; the Atlas wrapper adds CVA.

```tsx
const buttonVariants = cva('...base classes', {
  variants: {
    variant: { primary: '...', secondary: '...', ghost: '...' },
    size: { sm: '...', md: '...', lg: '...' }
  },
  defaultVariants: { variant: 'primary', size: 'md' }
});
```

Declare `defaultVariants` — it makes consumers' lives easier and keeps types
honest. Do not scatter defaults through `{variant ?? 'primary'}` expressions.

## Props interface rules

- Extend `ComponentPropsWithoutRef<'button'>` (or the correct element) — this
  gives consumers every native HTML attribute.
- Add variant props via `VariantProps<typeof xVariants>`.
- Add Atlas-specific props with TSDoc comments — they will show up in
  Storybook controls and in consumer IDEs.
- Never accept a prop whose only purpose is to pass it to a single internal class string — use `className` instead.

## Do not

- Do not style Radix primitives by overriding their CSS directly — use the `className` prop
- Do not conditionally render a whole Radix primitive based on a prop — the primitive may manage state the consumer expects to be stable
- Do not forget to forward the ref. Every user of `useRef` on an Atlas component deserves it.
- Do not hand-roll focus trapping, portals, or keyboard handling — Radix already provides them
