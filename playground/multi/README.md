# Compose — Multi-Agent Setup (Claude Code + Cursor)

A collaborative note-taking app built on SvelteKit, configured for
**parallel work by two AI agents** with non-overlapping lanes:

- **Claude Code** — backend, database, auth, API surface
- **Cursor** — components, styling, interaction patterns

## Why two agents?

Real teams split by concern, and AI-assisted teams can too. Each agent runs
with a scoped instruction file and scoped rules, which:

1. Keeps context tight (no rules about `.svelte` styling while editing server code)
2. Avoids conflicting opinions (Claude won't try to restyle a component Cursor already decided on)
3. Enables true parallel work in separate branches

## The split

| Domain | Files | Agent |
| --- | --- | --- |
| Server code | `src/lib/server/**`, `hooks.server.ts`, `**/+page.server.ts`, `**/+server.ts` | Claude |
| Database | `src/lib/server/db/schema.ts`, migrations | Claude |
| Components | `src/lib/components/**` | Cursor |
| Page markup | `**/+page.svelte`, `**/+layout.svelte` | Cursor |
| Styles | `app.css`, Tailwind config | Cursor |
| Shared types | `src/lib/types/**`, `src/lib/validation.ts` | Both (respect each other's naming) |

## Instruction files

- `CLAUDE.md` — Claude's instruction file with the lane rules
- `.cursor/rules/*.mdc` — Cursor's scoped rules by file glob
- `.cursorrules` — legacy fallback for old Cursor versions

## What's in `.claude/`

| Path | Purpose |
| --- | --- |
| `settings.json` | Permissions, model, hooks |
| `hooks/pre-commit.sh` | Lint + type-check on server files only |
| `agents/drizzle-migrator.md` | Plans safe schema changes |
| `agents/security-reviewer.md` | Audits auth before merge |
| `agents/handoff-writer.md` | Writes handoff notes when a task crosses into Cursor's lane |
| `commands/add-route.md` | Scaffold a route + hand off the UI to Cursor |
| `commands/migrate.md` | Generate a migration via the subagent |
| `commands/review.md` | Review the server-side diff |
| `skills/sveltekit-routes/SKILL.md` | Load functions, form actions, endpoints |
| `skills/drizzle-queries/SKILL.md` | Drizzle query patterns |

## What's in `.cursor/`

| Path | Purpose |
| --- | --- |
| `rules/components.mdc` | Svelte component conventions, scoped to `src/lib/components/**` |
| `rules/svelte5-runes.mdc` | Svelte 5 runes patterns |
| `rules/tailwind.mdc` | Tailwind + design tokens |
| `rules/forms.mdc` | Form action wiring, scoped to `**/+page.svelte` |
| `rules/boundaries.mdc` | Enforces the lane split — refuses to edit server files |
| `commands/new-component.md` | Scaffold a component |
| `commands/wire-form.md` | Wire a Svelte form to a `+page.server.ts` form action |
| `commands/review.md` | Review the frontend-side diff |
| `skills/svelte-components/SKILL.md` | Component authoring patterns |
| `skills/tailwind-styling/SKILL.md` | Design-token-aware styling |

## Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate
pnpm dev
```
