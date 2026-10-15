# opencode.md — Kite Analytics

## Project Overview

Kite is a privacy-first web analytics dashboard. The app is a Nuxt 3 SPA that
connects to a separate self-hosted Kite backend API (not in this repo). It
ships as static assets behind any CDN and is fully client-rendered once loaded.

Users include website owners viewing their own traffic and team admins
managing permissions across sites.

## Tech Stack

- **Framework:** Nuxt 3 (SPA mode — `ssr: false`)
- **UI:** Vue 3 + `<script setup>` with the Composition API
- **Language:** TypeScript 5.6+ (strict)
- **State:** Pinia with `setup` store syntax
- **Data fetching:** `$fetch` from `ofetch` (Nuxt's built-in) with a typed API client wrapper
- **Styling:** UnoCSS (Tailwind-compatible with smaller output)
- **Charts:** `@unovis/vue` (lightweight, no d3)
- **Testing:** Vitest + `@vue/test-utils`, Playwright for e2e
- **Package manager:** pnpm

## Project Structure

```
app/
├── app.vue                        # Root component
├── components/
│   ├── ui/                        # Reusable UI primitives
│   │   ├── KButton.vue
│   │   ├── KInput.vue
│   │   └── …
│   ├── charts/
│   │   ├── TimeseriesChart.vue
│   │   └── BreakdownBar.vue
│   └── sites/
│       ├── SiteList.vue
│       └── SiteCard.vue
├── composables/
│   ├── useAuth.ts
│   ├── useApiClient.ts
│   ├── useQueryParams.ts
│   └── useDateRange.ts
├── layouts/
│   ├── default.vue
│   └── auth.vue
├── middleware/
│   ├── auth.global.ts            # Redirect unauthenticated to /login
│   └── workspace.ts              # Ensure :workspaceId param matches a joined workspace
├── pages/
│   ├── index.vue                  # Marketing redirect
│   ├── login.vue
│   ├── dashboard/
│   │   ├── index.vue
│   │   └── [workspaceId]/
│   │       ├── index.vue
│   │       ├── sites/
│   │       │   ├── index.vue
│   │       │   └── [siteId].vue
│   │       └── settings.vue
│   └── accept-invite/[token].vue
├── stores/
│   ├── auth.ts
│   ├── workspace.ts
│   └── sites.ts
└── utils/
    ├── format.ts
    └── api.ts
```

## Coding Conventions

- `<script setup lang="ts">` for every component; never Options API
- Import order: Vue/Nuxt → composables → components → utils → types
- Use `<script>` macros without wrapping: `const { $fetch } = useNuxtApp()`
- Naming:
  - Components: PascalCase, prefixed with `K` for UI primitives (e.g., `KButton.vue`)
  - Composables: `useXxx` in `app/composables/`
  - Pinia stores: camelCase setup stores (`useAuthStore`)
  - Utils: camelCase functions in `app/utils/` auto-imported by Nuxt
- `const` by default; never `var`
- Explicit types on function signatures; rely on inference for locals
- Use `ref()` for primitives, `reactive()` for objects, `computed()` for derivations
- One component per file; filename matches the default export (SFC)

## Data fetching

- Use `useFetch` for page-level SSR-safe fetches (though SSR is off, it dedupes)
- Use the typed API client (`useApiClient()`) for mutations and imperative calls
- Never call `fetch()` directly — go through the client for error formatting + auth headers
- Treat the API as the source of truth; don't mirror its state in Pinia unless you need optimistic UI

## State

- Pinia for shared state that crosses routes (`authStore`, `workspaceStore`)
- Component-local state stays in the component via `ref`/`reactive`
- Derived state via `computed` — never store it in Pinia
- Persisted state (e.g., `selectedDateRange`) uses `@pinia-plugin-persistedstate/nuxt`

## Routing

- File-based. Dynamic segments with `[param]`, catch-alls with `[...slug]`
- Every authenticated page depends on `auth.global.ts`
- Workspace-scoped pages add `definePageMeta({ middleware: 'workspace' })`

## Testing

- Unit tests for composables and pure functions colocate with source: `format.ts` → `format.test.ts`
- Component tests use `@vue/test-utils` + `@testing-library/vue` for user-centric assertions
- E2E tests in `e2e/` run against a mocked API via `msw`
- Every bug fix includes a regression test

## Do

- Run `pnpm typecheck && pnpm lint && pnpm test` before declaring a task done
- Prefer `v-model` for two-way binding over manual `:value` + `@update`
- Use `<slot>` over prop-driven rendering when the consumer should control content
- Use `definePageMeta` for layout selection, middleware, transition names

## Don't

- Don't use the Options API
- Don't import from `vue-demi` — Vue 3 is the baseline
- Don't install Vuex (use Pinia)
- Don't install Nuxt modules without checking the open issues page — the ecosystem is volatile
- Don't use `localStorage` directly for auth — use the httpOnly cookie pattern (auth store handles it)
- Don't commit `.env` files; `.env.example` is the template
