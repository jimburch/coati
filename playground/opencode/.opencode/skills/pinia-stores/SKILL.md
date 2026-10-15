---
name: Pinia Setup Stores
description: Teaches OpenCode how Kite structures Pinia stores — setup syntax, persistence, cross-store access, and testing.
---

# Pinia Setup Stores

Every Pinia store in Kite uses the setup syntax. The Options syntax is
forbidden — it reads like Vuex, and that's not what we're here for.

## Setup store template

```typescript
// app/stores/workspace.ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: 'owner' | 'admin' | 'member';
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([]);
  const activeId = ref<string | null>(null);

  const active = computed<Workspace | null>(() =>
    workspaces.value.find((w) => w.id === activeId.value) ?? null
  );

  const canManage = computed(() =>
    active.value?.role === 'owner' || active.value?.role === 'admin'
  );

  async function load(): Promise<void> {
    const api = useApiClient();
    workspaces.value = await api.workspaces.list();
    if (!activeId.value && workspaces.value[0]) {
      activeId.value = workspaces.value[0].id;
    }
  }

  function setActive(id: string): void {
    if (workspaces.value.some((w) => w.id === id)) {
      activeId.value = id;
    }
  }

  function reset(): void {
    workspaces.value = [];
    activeId.value = null;
  }

  return { workspaces, activeId, active, canManage, load, setActive, reset };
}, {
  persist: {
    storage: piniaPluginPersistedstate.localStorage(),
    pick: ['activeId']  // never persist the workspace list — re-fetch on load
  }
});
```

## What to store

- Cross-route state (active workspace, user preferences)
- User identity (via `authStore`)
- Cached lookups that rarely change (workspace list, feature flags)

## What NOT to store

- Component-local UI state (open/closed, hover, drag position)
- Data tied to the current route (filter params, sort order) — use `useRouteQuery` from VueUse
- Derived state — use `computed` in the component
- Auth tokens — httpOnly cookies only, set by the backend

## Cross-store access

Call other stores from inside actions:

```typescript
async function archiveSite(siteId: string): Promise<void> {
  const workspaceStore = useWorkspaceStore();
  const api = useApiClient();
  await api.sites.archive(workspaceStore.activeId!, siteId);
  sites.value = sites.value.filter((s) => s.id !== siteId);
}
```

Never import stores at module top-level into a store — it creates circular
dependencies. Always call inside an action.

## Resetting on logout

Every store exposes a `reset()`. The `authStore.logout()` action calls reset
on every other store:

```typescript
async function logout(): Promise<void> {
  await useApiClient().auth.logout();
  useWorkspaceStore().reset();
  useSitesStore().reset();
  useSettingsStore().reset();
  user.value = null;
}
```

If you add a new store, update `authStore.logout()` to reset it.

## Testing

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkspaceStore } from './workspace';

describe('workspaceStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('initializes empty', () => {
    const store = useWorkspaceStore();
    expect(store.workspaces).toEqual([]);
    expect(store.active).toBeNull();
  });

  it('selects first workspace as active after load', async () => {
    const store = useWorkspaceStore();
    await store.load(); // uses mocked API client
    expect(store.activeId).toBe('ws_1');
  });

  it('does not switch active to an unknown id', () => {
    const store = useWorkspaceStore();
    store.workspaces = [{ id: 'ws_1', name: 'A', slug: 'a', role: 'owner' }];
    store.setActive('unknown');
    expect(store.activeId).toBeNull();
  });
});
```

## Persistence rules

- Persist only safe fields: user IDs, preferences, UI selections
- Never persist: auth tokens, API keys, PII, workspace names (re-fetch on load)
- Use `pick` to whitelist; don't rely on blanket persistence
- Persistence is `localStorage` by default — for mobile/app use `sessionStorage` or cookies

## Don't

- Don't use the Options syntax — setup only
- Don't access `this` — setup stores don't have `this`
- Don't expose refs directly that consumers shouldn't mutate — wrap in `readonly()`
- Don't forget the second `defineStore` argument exists — it's where `persist` lives
- Don't create a store for a single component's state — use `ref`/`reactive` locally
