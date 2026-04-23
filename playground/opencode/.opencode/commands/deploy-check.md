---
description: Pre-flight checks before deploying Kite to Cloudflare Pages
---

# /deploy-check

Run the full gauntlet before shipping. Stop on any failure.

## Steps

### 1. Type check

```
pnpm typecheck
```

Must pass with zero errors.

### 2. Lint

```
pnpm lint
```

Warnings are fine; errors block.

### 3. Unit + component tests

```
pnpm test:unit
```

### 4. E2E smoke

```
pnpm test:e2e --grep @smoke
```

Only the `@smoke` tag — full e2e runs in CI, this is the fast subset.

### 5. Build

```
pnpm generate
```

Check output size:
- `.output/public/_nuxt/*.js` total size should be < 300KB gzipped.
- If a new JS file appears with > 50KB, investigate (likely a chart lib or
  a full-page import in a route that could lazy-load).

### 6. Bundle preview

```
pnpm preview
```

Spot-check the login and dashboard routes manually — or via Playwright in the
background.

### 7. Environment sanity

Verify `.env.example` lists every variable the build actually reads:

```
grep -rE "process\.env\.[A-Z_]+" app/ | awk '{print $NF}' | sort -u
```

Any new env var must also land in:
- `.env.example` (with a comment)
- Cloudflare Pages dashboard (production secrets)
- `nuxt.config.ts` `runtimeConfig` block (typed)

## Output

| Check | Status | Notes |
| --- | --- | --- |
| Typecheck | ✓ | — |
| Lint | ✓ | 3 warnings (non-blocking) |
| Unit tests | ✓ | 142 passed |
| Smoke e2e | ✓ | 8 passed |
| Build | ✓ | 182KB JS gzipped |
| Preview | — | manual spot-check |
| Env sanity | ✓ | — |

Verdict: `SHIP` or `HOLD`.
