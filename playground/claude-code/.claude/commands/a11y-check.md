---
description: Run an accessibility audit against the running dev server via Playwright MCP
argument-hint: "[route-path]"
---

# /a11y-check

Audit accessibility for the given route (default `/dashboard`) using the
Playwright MCP server.

## Steps

1. Check that the dev server is running on `http://localhost:5173`. If not, ask the user to start it with `pnpm dev`.
2. Use the `playwright` MCP server to:
   - Navigate to `${1:-/dashboard}`
   - Inject axe-core via `page.evaluate` using `@axe-core/playwright`'s standalone build
   - Run the audit and collect violations
3. Group violations by severity (critical, serious, moderate, minor).
4. For each violation, cite:
   - The rule ID (e.g., `color-contrast`, `label`)
   - The failing selector
   - The source file most likely responsible (check `src/lib/components/` and `src/routes/` for that selector)
5. Propose fixes per violation. Do not edit files automatically.

## Output

```
Route: /dashboard (viewport 1280x720)
Critical: 0
Serious: 2
  - color-contrast — .btn-outline (src/lib/components/ui/button/button.svelte:14)
  - label — input#search (src/routes/(app)/dashboard/+page.svelte:42)
Moderate: 1
Minor: 4
```
