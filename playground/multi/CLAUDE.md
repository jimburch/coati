# CLAUDE.md — Compose (Multi-Agent Setup)

## Project Overview

Compose is a collaborative note-taking app built on SvelteKit. This repository
is set up to be worked on by **two AI agents in parallel**, each with its own
lane of responsibility:

- **Claude Code** owns the backend surface: server routes, database schema,
  auth, migrations, tRPC-style endpoints, and architectural decisions.
- **Cursor** owns the frontend surface: Svelte components, Tailwind styling,
  interaction patterns, and the design system.

This file is the **Claude-specific** instruction file. The frontend-focused
conventions Cursor should follow live in `.cursor/rules/*.mdc`.

## Boundary rules (important)

- Claude edits `src/lib/server/`, `src/routes/**/+page.server.ts`,
  `+server.ts`, `hooks.server.ts`, `src/lib/server/db/schema.ts`, and
  migrations.
- Cursor edits `src/lib/components/`, `src/routes/**/+page.svelte`, `app.css`,
  and Tailwind config.
- **Shared:** `src/lib/types/`, `src/lib/validation.ts`, `package.json`.
  Either agent may edit these, but both must respect the other's naming.
- **Off-limits for Claude:** anything that's purely presentational. If a task
  requires both, Claude scaffolds the backend and explicitly hands the UI work
  to Cursor — don't write the component yourself.
- **Off-limits for Cursor:** direct database access from Svelte components.
  Always go through a `+page.server.ts` load or a form action.

## Tech Stack

- **Framework:** SvelteKit 2 (Svelte 5 runes)
- **Language:** TypeScript 5.6+ (strict)
- **Styling:** Tailwind CSS 3 + shadcn-svelte
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM
- **Auth:** Lucia Auth v3 + Arctic (GitHub OAuth)
- **Real-time:** Server-Sent Events for collaborative presence
- **Testing:** Vitest (unit) + Playwright (e2e)
- **Package manager:** pnpm

## Project Structure

```
src/
├── app.html
├── app.css                          # Tailwind base + shadcn tokens (Cursor-owned)
├── hooks.server.ts                  # Session validation (Claude-owned)
├── lib/
│   ├── server/                      # ━━━━━━━ CLAUDE'S LANE ━━━━━━━
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── schema.ts
│   │   │   └── migrations/
│   │   ├── auth/
│   │   ├── queries/
│   │   └── sse/                     # Presence channel
│   ├── components/                  # ━━━━━━━ CURSOR'S LANE ━━━━━━━
│   │   ├── ui/                      # shadcn-svelte primitives
│   │   ├── editor/
│   │   │   ├── Editor.svelte
│   │   │   ├── Toolbar.svelte
│   │   │   └── PresenceCursor.svelte
│   │   └── NoteList.svelte
│   ├── types/                       # ━━━ SHARED ━━━
│   │   └── index.ts
│   └── validation.ts                # ━━━ SHARED ━━━ (Zod schemas)
└── routes/
    ├── (marketing)/                 # SSR landing page
    ├── (app)/                       # Authenticated workspace
    │   ├── +layout.server.ts        # Auth guard (Claude)
    │   ├── +layout.svelte           # App shell (Cursor)
    │   └── notes/
    │       ├── +page.server.ts      # Data load (Claude)
    │       ├── +page.svelte         # UI (Cursor)
    │       └── [id]/
    └── api/
        └── v1/
            └── notes/+server.ts     # Claude
```

## Claude's conventions

### Server code

- All `.server.ts` files go through Drizzle — never hand-written SQL
- Every query filters by `workspaceId`
- Validate inputs with Zod using the shared schemas in `src/lib/validation.ts`
- Throw `error(...)` / `fail(...)` from SvelteKit — don't return error objects
- API routes return `{ data: T }` on success, `{ error, code }` on failure

### Schema changes

- Generate migrations via `pnpm db:generate`; never hand-write
- After any schema change, update the shared types in `src/lib/types/` — this
  is the seam Cursor relies on for component prop types
- Run the `drizzle-migrator` subagent for anything destructive

### Handoff to Cursor

When a task requires both backend and frontend, **stop after the backend is
done** and write a clear handoff note:

```markdown
## Handoff to Cursor

**Task:** Add an archive toggle to notes.

**Backend changes (done):**
- `src/lib/validation.ts` — added `ArchiveNoteSchema`
- `src/routes/(app)/notes/[id]/+page.server.ts` — new `archive` form action
- `src/lib/server/queries/notes.ts` — added `archiveNote`

**Frontend to-do:**
- Add an archive button to `src/lib/components/editor/Toolbar.svelte`
- Wire it to the `?/archive` form action
- Show archived state with a muted row in `NoteList.svelte`
```

## Do

- Run `pnpm check` (svelte-check + tsc) after every non-trivial change
- When editing shared files (`types/`, `validation.ts`), leave a comment noting the change so Cursor's next session knows
- Use the `security-reviewer` subagent before merging anything touching `auth/`

## Don't

- Don't edit `.svelte` files outside `+error.svelte` — that's Cursor's territory
- Don't style elements in server-rendered HTML — Cursor owns the visual layer
- Don't assume the component exists when writing a form action — write the action first, then hand off
- Don't check in generated files from `pnpm check` (`.svelte-kit/`)
