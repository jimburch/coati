---
name: Vitest + React Testing Library
description: Teaches Cursor how to write component and hook tests for Atlas UI using Vitest, RTL, and userEvent.
---

# Vitest + React Testing Library

Atlas tests cover components (render + behavior + refs) and custom hooks
(state transitions). Tests colocate with source.

## Setup

`vitest.config.ts` sets `environment: 'jsdom'`. Every test file imports
`@testing-library/jest-dom` via the global `vitest.setup.ts` — no per-file import.

## Component test template

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from './Dialog';

describe('Dialog', () => {
  it('opens when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Hello</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByRole('button', { name: /open/i }));

    expect(await screen.findByRole('dialog', { name: /hello/i })).toBeVisible();
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Hello</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

## Query priority

1. `getByRole(role, { name })` — combines a11y check with behavior test
2. `getByLabelText` for form fields
3. `getByText` for static content
4. `getByTestId` — only with a comment justifying why role/label didn't work

## Async queries

- `findBy*` — returns a promise, retries until timeout (for async appearance)
- `queryBy*` — returns `null` if not found (for "not rendered" assertions)
- `getBy*` — throws if not found (for "must be there now")

Rule of thumb: opening modals, loading data, focus changes → `findBy*`.

## userEvent

- Always `userEvent.setup()` at the top of each test. The setup object
  preserves internal state (keyboard modifiers, pointer position).
- Always `await` every interaction.
- Prefer high-level interactions (`user.click`, `user.type`, `user.keyboard`)
  over low-level (`fireEvent.keyDown`).

## Hooks

```tsx
import { renderHook, act } from '@testing-library/react';
import { useDisclosure } from './useDisclosure';

describe('useDisclosure', () => {
  it('defaults to closed', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggles open state', () => {
    const { result } = renderHook(() => useDisclosure());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });
});
```

## Snapshot tests

Avoid them. Snapshots rot — nobody reads a failing snapshot and concludes
"my change is wrong." Use explicit assertions about behavior instead.

Exception: a single rendered-markup snapshot per compound component is fine
if it documents structural invariants (e.g., `DialogContent` always renders
inside a portal).

## Don't

- Don't use `container.querySelector` — it bypasses RTL's a11y awareness
- Don't `jest.fn()` — use `vi.fn()`
- Don't `beforeEach(() => render(...))` — inline `render()` per test keeps each isolated
- Don't use `waitFor` when a `findBy*` query would work
- Don't mock Radix internals — trust the library
