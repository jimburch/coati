---
name: Vue Testing for Kite
description: Teaches OpenCode how to test Vue components, composables, and Pinia stores using Vitest, @vue/test-utils, and @testing-library/vue.
---

# Testing Kite

Kite uses Vitest with `jsdom`. Component tests use
`@testing-library/vue` for user-centric queries; lower-level tests use
`@vue/test-utils` when DOM or instance inspection is required.

## Component tests

```typescript
// app/components/sites/SiteCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import SiteCard from './SiteCard.vue';

const site = {
  id: 'site_1',
  name: 'Acme Blog',
  domain: 'acme.example.com',
  monthlyEvents: 12345
};

describe('SiteCard', () => {
  it('renders the site name', () => {
    render(SiteCard, { props: { site } });
    expect(screen.getByRole('heading', { name: 'Acme Blog' })).toBeInTheDocument();
  });

  it('emits select with the site id when the button is clicked', async () => {
    const user = userEvent.setup();
    const { emitted } = render(SiteCard, { props: { site } });

    await user.click(screen.getByRole('button', { name: /select/i }));

    expect(emitted().select).toEqual([['site_1']]);
  });

  it('falls back to the domain when name is empty', () => {
    render(SiteCard, { props: { site: { ...site, name: '' } } });
    expect(screen.getByRole('heading', { name: 'acme.example.com' })).toBeInTheDocument();
  });

  it('hides usage by default', () => {
    render(SiteCard, { props: { site } });
    expect(screen.queryByText(/12,345 events/)).not.toBeInTheDocument();
  });

  it('shows usage when showUsage is true', () => {
    render(SiteCard, { props: { site, showUsage: true } });
    expect(screen.getByText(/12,345 events/)).toBeInTheDocument();
  });
});
```

## Composable tests

Composables run in a component context. Use `useSetup` from `@vue/test-utils`
or wrap in a trivial component.

```typescript
import { describe, it, expect } from 'vitest';
import { useSetup } from '@vue/test-utils';
import { useDateRange } from './useDateRange';

describe('useDateRange', () => {
  it('starts with the last-7-days range', () => {
    const [state] = useSetup(() => useDateRange());
    expect(state.label.value).toMatch(/last 7 days/i);
  });

  it('updates label when range changes', () => {
    const [state] = useSetup(() => useDateRange());
    state.setRange('last-30-days');
    expect(state.label.value).toMatch(/last 30 days/i);
  });
});
```

## Pinia store tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkspaceStore } from './workspace';

beforeEach(() => setActivePinia(createPinia()));

describe('workspaceStore', () => {
  it('starts empty', () => {
    const store = useWorkspaceStore();
    expect(store.workspaces).toEqual([]);
    expect(store.active).toBeNull();
  });

  it('computes canManage from role', () => {
    const store = useWorkspaceStore();
    store.workspaces = [{ id: '1', name: 'A', slug: 'a', role: 'member' }];
    store.setActive('1');
    expect(store.canManage).toBe(false);

    store.workspaces = [{ id: '1', name: 'A', slug: 'a', role: 'owner' }];
    expect(store.canManage).toBe(true);
  });
});
```

## E2E with Playwright

E2E tests live under `e2e/` and run against a mocked API via `msw`. Keep
them narrow — smoke tests only, run in CI on every PR.

```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('login @smoke', () => {
  test('redirects to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('correct-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

## Query priority

1. `getByRole(role, { name })`
2. `getByLabelText` for form fields
3. `getByText` for static content
4. `getByTestId` only with a comment

## Rules

- Colocate unit/component tests with source
- Every bug fix adds a regression test
- Use `userEvent` for interactions, not `fireEvent` or `wrapper.trigger()`
- Mock API calls with `msw`, not inline `vi.mock('ofetch')` — reusable across tests
- Don't test implementation (private functions, internal Pinia state shapes)
- Prefer `toEqual` over `toBe` for objects and arrays

## Don't

- Don't use `mount()` from vue-test-utils when `render()` from testing-library suffices
- Don't assert on component internals (`wrapper.vm.foo`) — test behavior, not implementation
- Don't share state across tests via module-level `let` variables
- Don't add `it.only` / `describe.only` in committed code
