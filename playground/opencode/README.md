# Kite Analytics — OpenCode Setup

A privacy-first web analytics dashboard built as a Nuxt 3 SPA. This
repository ships a complete OpenCode configuration: project instructions,
provider fallbacks, commands, skills, and MCP servers.

## What's in `.opencode/`

| Path | Purpose |
| --- | --- |
| `commands/new-page.md` | Scaffold a new route following Nuxt file-based conventions |
| `commands/pinia-store.md` | Scaffold a new Pinia setup store with persistence |
| `commands/composable.md` | Scaffold a Vue composable with typed returns |
| `commands/review.md` | Review the diff against Kite conventions |
| `commands/test-coverage.md` | Identify test gaps in the diff |
| `commands/deploy-check.md` | Pre-flight checks before a Cloudflare Pages deploy |
| `skills/vue-composition/SKILL.md` | `<script setup>`, composables, reactive primitives |
| `skills/pinia-stores/SKILL.md` | Setup-store patterns, persistence, devtools |
| `skills/nuxt-conventions/SKILL.md` | File-based routing, middleware, auto-imports |
| `skills/testing/SKILL.md` | Vue Testing Library + Vitest patterns |

## `.opencode.json`

Configures the default provider (Anthropic), with OpenAI and Google as
fallbacks; registers MCP servers (filesystem, fetch, playwright, github);
sets context paths and exclusions; defines a shell allow/deny list.

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm dev          # http://localhost:3000
pnpm test         # vitest in watch mode
pnpm test:e2e     # playwright against the dev server
```

## Deploying

```bash
pnpm generate     # static output to .output/public/
```

Deploys happen on push to `main` via the Cloudflare Pages GitHub integration.
