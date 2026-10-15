---
description: Scaffold a new Nuxt page with layout, middleware, and baseline data fetch
args: <path> [--auth] [--workspace]
---

# /new-page

Create a new Nuxt page under `app/pages/` following file-based routing
conventions.

## Inputs

- `$1` — route path, e.g. `/dashboard/reports/exports`. Kebab-case, no trailing slash.
- `--auth` — require an authenticated session (adds auth middleware)
- `--workspace` — workspace-scoped page (requires `[workspaceId]` in the path)

## Steps

1. Translate the path to a filesystem path:
   - `/dashboard/reports` → `app/pages/dashboard/reports.vue`
   - `/dashboard/[workspaceId]/sites/[siteId]` → `app/pages/dashboard/[workspaceId]/sites/[siteId].vue`
2. Check if the file already exists. Refuse to overwrite.
3. Scaffold the `.vue` file with:
   - `<script setup lang="ts">` block
   - `definePageMeta({ layout: 'default', middleware: [...] })` if `--auth` or `--workspace`
   - A `useFetch` call with a typed response if data is required
   - A template with a heading and a `<pre>` dev-preview of the data
4. If the path introduces a new folder, ensure an `index.vue` exists at each
   level (Nuxt needs this for nested layouts).
5. If the path uses `[workspaceId]`, validate that `app/middleware/workspace.ts`
   already handles it — if not, fail loudly and ask the user.
6. Run `pnpm typecheck`. Fix any complaints.

## Template

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'workspace'],
  layout: 'default'
});

const route = useRoute();
const { data, pending, error, refresh } = await useFetch(
  () => `/workspaces/${route.params.workspaceId}/...`,
  { key: route.fullPath }
);
</script>

<template>
  <section>
    <h1>Page title</h1>
    <p v-if="pending">Loading…</p>
    <p v-else-if="error">Failed to load: {{ error.message }}</p>
    <pre v-else>{{ data }}</pre>
  </section>
</template>
```

## Output

Print a summary:
- File created at: `app/pages/...`
- Middleware attached: `auth`, `workspace` (or none)
- Next steps: add to the sidebar config in `app/config/nav.ts`
