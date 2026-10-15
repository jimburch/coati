---
description: Scaffold a new Pinia setup store with optional persistence
args: <name> [--persist]
---

# /pinia-store

Create a new Pinia store in `app/stores/<name>.ts` using the setup syntax.

## Steps

1. Translate `$1` to camelCase: `sitePreferences` → `useSitePreferencesStore`, file `app/stores/sitePreferences.ts`.
2. Check for collision — refuse to overwrite.
3. Scaffold the store:

```typescript
import { defineStore } from 'pinia';

export const use<Name>Store = defineStore('<name>', () => {
  // state
  const items = ref<Item[]>([]);
  const selectedId = ref<string | null>(null);

  // getters (computed)
  const selected = computed(() =>
    items.value.find((i) => i.id === selectedId.value) ?? null
  );

  // actions
  async function load(workspaceId: string): Promise<void> {
    const api = useApiClient();
    items.value = await api.listItems(workspaceId);
  }

  function select(id: string): void {
    selectedId.value = id;
  }

  function reset(): void {
    items.value = [];
    selectedId.value = null;
  }

  return { items, selectedId, selected, load, select, reset };
}, {
  persist: <persist-config>  // only if --persist
});
```

4. If `--persist`, configure `pinia-plugin-persistedstate` to persist only
   safe fields (never tokens, never PII):
   ```typescript
   persist: {
     storage: piniaPluginPersistedstate.localStorage(),
     pick: ['selectedId']
   }
   ```
5. Add a colocated test at `app/stores/<name>.test.ts` covering:
   - Initial state
   - Each action's effect on state
   - Getter recomputes when state changes
   - Reset clears state
6. Run `pnpm typecheck && pnpm test:unit`. Fix issues.

## Do not

- Do not persist auth tokens or API keys
- Do not use the Options API (`defineStore('name', { state, getters, actions })`) — setup syntax only
- Do not call composables from outside the setup function body
- Do not forget to export the type: consumers often need `StoreInstance = ReturnType<typeof useFooStore>`
