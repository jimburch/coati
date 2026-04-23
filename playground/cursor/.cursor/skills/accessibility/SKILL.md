---
name: Accessibility Patterns
description: Teaches Cursor how to implement keyboard navigation, ARIA patterns, focus management, and screen-reader announcements for Atlas UI.
---

# Accessibility Patterns

Atlas components must be usable with a keyboard alone, announce state to
screen readers, and pass WCAG 2.2 AA color contrast. These patterns are
non-negotiable.

## Focus management

### Trapping focus in a dialog

Radix Dialog handles this for you. If you're not using Radix (rare), use
`focus-trap-react` — never hand-roll it.

### Returning focus on close

When a dialog/popover closes, focus returns to the trigger. Radix handles
this automatically. Do not add manual `trigger.focus()` calls — they race
the internal handler.

### Focus-visible

Every interactive element has a visible focus ring. Base your styles on
`focus-visible:` so mouse users don't see the ring, keyboard users do.

```tsx
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
```

Never use `outline: none` without an alternative focus indicator.

## Keyboard patterns by component

Follow the WAI-ARIA Authoring Practices patterns. Radix implements them; your
job is not to break them when wrapping.

| Component | Expected keys |
| --- | --- |
| Button | Enter, Space activate |
| Checkbox, Switch | Space toggles |
| Dialog | Escape closes, Tab cycles within |
| Menu, Dropdown | Arrow keys navigate, Home/End jump, Escape closes, typeahead for long lists |
| Tabs | Arrow keys move, Home/End jump, manual activation by default |
| Radio group | Arrow keys navigate AND select (single-activation model) |
| Combobox | Down opens, arrow keys navigate suggestions, Enter selects, Escape clears |
| Tooltip | Shown on focus AND hover, dismissed on Escape |

## ARIA naming

Every interactive element has an accessible name. Priority order:

1. Visible text content (`<button>Save</button>`)
2. Associated label (`<label htmlFor="email">` + `<input id="email">`)
3. `aria-labelledby` pointing at a nearby label element
4. `aria-label` as a last resort

Icon-only buttons always need one:

```tsx
<Button iconOnly aria-label="Close">
  <XIcon aria-hidden="true" />
</Button>
```

## Live regions

For announcements (toast, form errors, loading), use a live region:

```tsx
<div role="status" aria-live="polite">
  {message}
</div>
```

Use `polite` for non-critical updates. Use `assertive` (`role="alert"`) only
for errors or urgent info — it interrupts the current announcement.

## Form validation

Every form error is associated with its input via `aria-describedby`:

```tsx
<label htmlFor="email">Email</label>
<input
  id="email"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
/>
{error && <p id="email-error" role="alert">{error}</p>}
```

## Color contrast

Every text/background pair meets 4.5:1 (or 3:1 for large text, ≥ 18pt or ≥ 14pt bold).
Every focus ring meets 3:1 against both adjacent colors.

Check with:
- Chromatic's a11y addon (runs axe automatically)
- `pnpm test:a11y` (Playwright + axe)
- Stark, Contrast, or dev tools' contrast checker for design review

## Reduced motion

Respect `prefers-reduced-motion`. Wrap nontrivial transitions in `motion-safe:`:

```tsx
'motion-safe:transition-transform motion-safe:duration-200'
```

For Framer Motion, respect the user's preference via the `useReducedMotion()` hook.

## Common bugs

- **Escape inside an input closes both the input's autocomplete AND the parent
  dialog.** Stop propagation if you handle Escape inside a composite.
- **Focus leaves the portal when a Radix Popover unmounts its content.**
  Use `Popover.Trigger` with `onOpenChange` and return focus explicitly if
  you've done something unusual.
- **Screen readers announce "group" on every `<div role="group">`.** Only use
  `role="group"` when the grouping has an accessible name (`aria-labelledby`).

## Don't

- Don't use `<div role="button">` when `<button>` works
- Don't use `aria-hidden` on focusable elements (they stay in tab order but disappear from AT — a trap)
- Don't trap focus outside of modal contexts
- Don't rely on placeholder text as a label — placeholders disappear when typing
- Don't set `tabIndex` to a positive number — always `0` or `-1`
