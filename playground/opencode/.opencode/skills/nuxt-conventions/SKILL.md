---
name: Nuxt 3 Conventions
description: Teaches OpenCode Kite's Nuxt 3 conventions — file-based routing, middleware, auto-imports, modules, and the runtime config.
---

# Nuxt 3 Conventions

Kite uses Nuxt 3 in SPA mode (`ssr: false`). Most Nuxt magic still applies —
auto-imports, file-based routing, layouts, middleware — but anything
server-rendered is off-limits.

## File-based routing

- `app/pages/index.vue` → `/`
- `app/pages/dashboard/sites.vue` → `/dashboard/sites`
- `app/pages/dashboard/[workspaceId]/index.vue` → `/dashboard/:workspaceId`
- `app/pages/dashboard/[workspaceId]/sites/[siteId].vue` → `/dashboard/:workspaceId/sites/:siteId`
- `app/pages/[...slug].vue` → catch-all fallback (404)

For nested layouts, use a matching folder: `app/pages/dashboard/` + `app/pages/dashboard.vue`.
Never hand-register routes in `nuxt.config.ts`.

## `definePageMeta`

Declared at the top of `<script setup>`:

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'workspace'],
  keepalive: true,
  pageTransition: { name: 'fade', mode: 'out-in' }
});
</script>
```

## Layouts

- `app/layouts/default.vue` — wraps every page unless overridden
- `app/layouts/auth.vue` — login/signup pages (no nav, centered card)

Switch layouts via `definePageMeta({ layout: 'auth' })`.

## Middleware

Three flavors:

1. **Inline:** `definePageMeta({ middleware: (to, from) => {...} })` — one-off
2. **Named:** file at `app/middleware/auth.ts`, invoked by name
3. **Global:** file at `app/middleware/auth.global.ts`, runs on every navigation

Kite conventions:
- `auth.global.ts` redirects unauthenticated users to `/login`
- `workspace.ts` runs on workspace-scoped pages and ensures the URL param
  matches a workspace the user belongs to — redirects to `/dashboard` if not

```typescript
// app/middleware/workspace.ts
export default defineNuxtRouteMiddleware((to) => {
  const workspaceStore = useWorkspaceStore();
  const wsId = to.params.workspaceId as string | undefined;
  if (!wsId) return;
  const found = workspaceStore.workspaces.find((w) => w.id === wsId);
  if (!found) return navigateTo('/dashboard');
});
```

## Auto-imports

Nuxt auto-imports from:
- `app/composables/` — every `useXxx` is globally available
- `app/utils/` — every exported function is globally available
- `app/components/` — every component is globally available by filename
- `vue` — `ref`, `computed`, `watch`, `onMounted`, etc.
- `vue-router` — `useRoute`, `useRouter`

This means you rarely need imports in component files. Resist the urge to
add explicit imports "for clarity" — follow the project convention.

Auto-imports are typed. If your editor can't find `useMyStore`, run
`pnpm dev` once to generate `.nuxt/types.d.ts`.

## `useFetch` vs. `$fetch` vs. API client

Three ways to talk to the API. Pick correctly:

- **`useFetch`** — page-level data fetching. Deduplicates across setup; returns `{ data, pending, error, refresh }`. Use in `<script setup>` of pages.
- **`$fetch`** — direct imperative call. Use inside event handlers, inside stores.
- **`useApiClient()`** — Kite's typed API wrapper around `$fetch`. Adds auth headers, formats errors, provides method-per-resource API. Prefer this for any call that isn't the simplest `useFetch`.

```typescript
// Imperative call inside a store
const api = useApiClient();
const sites = await api.sites.list(workspaceId);

// Page load
const { data, pending } = await useFetch<Site[]>('/sites', { baseURL: API_URL, query: { workspaceId } });
```

## Runtime config

Public values and secrets both go through `nuxt.config.ts` `runtimeConfig`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // server-only (empty in SPA but keeps the API stable)
    internalApiKey: '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:4000',
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || ''
    }
  }
});
```

Read with `useRuntimeConfig().public.apiBase`. Never `process.env.*` in
component code.

## Modules

Kite uses these Nuxt modules (declared in `nuxt.config.ts`):

- `@pinia/nuxt` — stores
- `@vueuse/nuxt` — VueUse composables auto-imported
- `@unocss/nuxt` — CSS utilities
- `@nuxt/test-utils/module` — test helpers

Adding a new module: check compatibility with Nuxt 3.14+ and SSR disabled.
Some modules assume SSR; they won't work in our setup.

## Don't

- Don't put server routes in `server/api/` — we're SPA-only; the backend is separate
- Don't use `useAsyncData` unless you specifically need its cache key — `useFetch` is usually fine
- Don't deep-import from `#app` or `#imports` — rely on auto-imports
- Don't reference `window` at module scope — guard with `if (import.meta.client)` or use `onMounted`
