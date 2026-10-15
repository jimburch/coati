---
name: Storybook Story Authoring
description: Teaches Cursor how to write CSF 3 stories for Atlas UI that drive both human exploration and Chromatic visual regression.
---

# Story Authoring

Every Atlas component ships with a `<Component>.stories.tsx` file colocated
with the source. Stories serve three audiences: designers browsing the UI,
developers copy-pasting usage examples, and Chromatic generating visual diffs.

## CSF 3 with `satisfies Meta<typeof X>`

Use `satisfies Meta<typeof Component>` — not `as Meta` and not untyped. The
`satisfies` operator preserves inference, so `StoryObj<typeof meta>` picks up
the component's prop types.

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Actions/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] }
  },
  args: { children: 'Click me' }
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
```

## Required stories per component

Every component exports at least:

1. **Default** — canonical usage with sensible args.
2. **AllVariants** / **AllSizes** — render every combination in a grid. Chromatic
   snapshots this; you get full variant coverage in one image.
3. **State variants** (Disabled, Loading, Error) if applicable.
4. **Interaction** — a `play` function that clicks, types, focuses, or opens
   a panel so Chromatic can snapshot the interaction state.
5. **Edge cases** — long text, short text, RTL, constrained container width.

## Grid stories for Chromatic

```tsx
export const AllVariants: Story = {
  render: (args) => (
    <div className="grid grid-cols-3 gap-4">
      <Button {...args} variant="primary">Primary</Button>
      <Button {...args} variant="secondary">Secondary</Button>
      <Button {...args} variant="ghost">Ghost</Button>
    </div>
  )
};
```

A single grid story per component beats six separate stories: one baseline,
one diff, one review cycle.

## Play functions

Use `play` to exercise behavior for Chromatic. Import `within` and `userEvent`
from the `play` context — not the top-level imports.

```tsx
export const OpenedTooltip: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: /help/i });
    await userEvent.hover(trigger);
  }
};
```

After the play function runs, Chromatic captures the rendered state — so
`OpenedTooltip` shows the tooltip visible.

## Accessibility in stories

The `@storybook/addon-a11y` runs axe on every story. To disable a specific
rule for an intentional demo:

```tsx
export const LowContrastDemo: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false, reviewOnFail: true }]
      }
    }
  }
};
```

Always include a comment explaining *why* a rule is disabled.

## Args vs. render

- Use `args` + argTypes for controllable props — this is what the UI panel drives
- Use `render` only when a story needs custom composition that args can't express
- Never hardcode props that are in argTypes — use `{...args}` and override only what differs

## Don't

- Don't write stories in JS — TypeScript only
- Don't `export default { …meta }` without `satisfies` — types will be `any`
- Don't share story names across files (Chromatic baseline collisions)
- Don't include data-fetching mocks in stories — Atlas is a pure UI library
- Don't use `storiesOf()` — that's CSF 2, removed in Storybook 8
