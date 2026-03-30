## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm (workspaces)
- **Add-ons**: eslint, prettier, vitest, playwright

---

# CLAUDE.md — Coati 🐦‍⬛

## Project Overview

Coati is a GitHub-like platform for developers to share, discover, and clone their AI coding workflows and setups. A "setup" is a first-class entity (like a repo on GitHub) that packages config files, scripts, hooks, skills, commands, documentation, and a manifest into a shareable, installable unit.

The platform has two surfaces:

1. **Web app** — discovery, profiles, social features, setup browsing/creation
2. **CLI tool (`coati`)** — clone/install setups to local machines, publish setups, search/star/follow from terminal

## Tech Stack

- **Framework:** SvelteKit (latest, App Router)
- **Language:** TypeScript everywhere (web, API, CLI)
- **Styling:** Tailwind CSS + shadcn-svelte
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Auth:** Lucia Auth v3 + Arctic (GitHub OAuth)
- **Markdown rendering:** mdsvex + shiki for syntax highlighting
- **SSR Strategy:** Hybrid — SSR for public routes, SPA for authenticated routes
- **Deployment:** adapter-node → PM2 behind Caddy on DigitalOcean
- **CLI framework:** commander (published to npm as `coati`)

## Project Structure

```
coati/
├── CLAUDE.md
├── package.json
├── svelte.config.js
├── drizzle.config.ts
├── src/
│   ├── app.html
│   ├── app.css                    # Tailwind base
│   ├── hooks.server.ts            # Lucia session validation
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.ts       # Drizzle client
│   │   │   │   ├── schema.ts      # All table definitions
│   │   │   │   └── migrations/    # Drizzle migrations
│   │   │   ├── auth.ts            # Lucia + Arctic setup
│   │   │   └── queries/           # Reusable DB query functions
│   │   │       ├── setups.ts
│   │   │       ├── users.ts
│   │   │       ├── stars.ts
│   │   │       ├── follows.ts
│   │   │       └── comments.ts
│   │   ├── components/            # Shared Svelte components
│   │   │   ├── ui/                # shadcn-svelte components
│   │   │   ├── SetupCard.svelte
│   │   │   ├── FileTree.svelte
│   │   │   ├── FileViewer.svelte
│   │   │   ├── MarkdownRenderer.svelte
│   │   │   ├── CommentThread.svelte
│   │   │   ├── StarButton.svelte
│   │   │   └── FollowButton.svelte
│   │   ├── utils/
│   │   │   ├── slug.ts
│   │   │   ├── markdown.ts
│   │   │   └── validation.ts
│   │   └── types/
│   │       └── index.ts           # Shared TypeScript types
│   └── routes/
│       ├── (public)/              # Layout group: SSR enabled
│       │   ├── +layout.ts         # export const ssr = true
│       │   ├── +page.svelte       # Landing page + trending
│       │   ├── explore/
│       │   │   ├── +page.svelte
│       │   │   └── +page.server.ts
│       │   └── [username]/
│       │       ├── +page.svelte           # User profile
│       │       ├── +page.server.ts
│       │       └── [slug]/
│       │           ├── +page.svelte       # Setup detail page
│       │           ├── +page.server.ts
│       │           └── files/
│       │               ├── +page.svelte   # Full file browser
│       │               └── +page.server.ts
│       ├── (app)/                 # Layout group: SSR disabled
│       │   ├── +layout.ts        # export const ssr = false
│       │   ├── +layout.server.ts  # Auth guard
│       │   ├── new/               # Create/edit setup
│       │   ├── settings/          # Account settings
│       │   └── feed/              # Activity feed
│       ├── api/                   # JSON API (serves CLI + web)
│       │   ├── v1/
│       │   │   ├── setups/
│       │   │   │   ├── +server.ts             # GET (list/search), POST (create)
│       │   │   │   ├── [id]/
│       │   │   │   │   ├── +server.ts         # GET, PATCH, DELETE
│       │   │   │   │   ├── files/+server.ts   # GET files for clone
│       │   │   │   │   ├── star/+server.ts    # POST/DELETE star
│       │   │   │   │   └── comments/+server.ts
│       │   │   │   └── trending/+server.ts
│       │   │   ├── users/
│       │   │   │   ├── [username]/+server.ts
│       │   │   │   └── [username]/follow/+server.ts
│       │   │   └── auth/
│       │   │       ├── device/+server.ts      # Device flow for CLI
│       │   │       └── callback/+server.ts
│       │   └── health/+server.ts
│       └── auth/                  # Web OAuth flow
│           ├── login/github/+server.ts
│           └── callback/github/+server.ts
├── cli/                           # CLI tool (separate package)
│   ├── package.json               # Published as `coati` on npm
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── commands/
│   │   │   ├── login.ts
│   │   │   ├── search.ts
│   │   │   ├── view.ts
│   │   │   ├── clone.ts
│   │   │   ├── init.ts
│   │   │   ├── publish.ts
│   │   │   ├── star.ts
│   │   │   └── follow.ts
│   │   ├── api.ts                 # HTTP client for Coati API
│   │   ├── auth.ts                # Token storage + device flow
│   │   ├── files.ts               # File writing + conflict resolution
│   │   └── config.ts              # CLI config (~/.coati/config.json)
│   └── bin/
│       └── coati.js              # Bin entry
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA-MODEL.md
│   ├── CLI-SPEC.md
│   ├── MVP-PLAN.md
│   └── GO-TO-MARKET.md
└── drizzle/                       # Generated migration files
```

## Coding Conventions

- Use TypeScript strict mode everywhere
- Prefer `const` over `let`; never use `var`
- Use Drizzle's query builder; avoid raw SQL unless necessary for performance
- All API routes return consistent JSON: `{ data: T }` on success, `{ error: string, code: string }` on failure
- Use SvelteKit form actions for web mutations (star, follow, comment, create setup)
- Use `+server.ts` API routes for CLI-facing endpoints
- Keep components small and composable; one component per file
- Use shadcn-svelte primitives; don't install additional UI libraries
- All user-facing text in components (not in server files) for future i18n
- Validate all inputs with Zod schemas shared between client and server
- Use Drizzle's `$inferSelect` and `$inferInsert` for type derivation from schema
- Check and resolve linter warnings before completing code changes

## Auth Flow

### Web (GitHub OAuth)

1. User clicks "Sign in with GitHub" → redirected to GitHub
2. GitHub redirects back to `/auth/callback/github` with code
3. Server exchanges code for access token via Arctic
4. Lucia creates session, sets session cookie
5. `hooks.server.ts` validates session on every request, populates `event.locals.user`

### CLI (GitHub Device Flow)

1. User runs `coati login`
2. CLI requests device code from `/api/v1/auth/device`
3. User visits GitHub URL, enters code
4. CLI polls for access token
5. Token stored locally at `~/.coati/config.json`
6. CLI sends token as `Authorization: Bearer <token>` on API requests

## SSR Strategy

- Routes under `(public)/` have SSR enabled — these are the pages that get shared, linked, and indexed
- Routes under `(app)/` have SSR disabled — these are authenticated dashboard pages
- API routes under `api/` are always server-side (they're just endpoints)

## Key Design Decisions

- File contents stored in PostgreSQL text columns for MVP (config files are tiny, <10KB)
- No file versioning in MVP — setups have a single "current" state
- Everything is public for MVP — no private setups
- The `coati.json` manifest is the platform's core standard — similar to package.json
- Stars and clone counts are denormalized on the setups table for query performance
- Username slugs and setup slugs are unique and URL-safe (lowercase, hyphens only)
- Comments support single-level threading (parent_id) — not deeply nested

## Important Patterns

### Loading setup data (SSR page)

```typescript
// src/routes/(public)/[username]/[slug]/+page.server.ts
export const load: PageServerLoad = async ({ params }) => {
	const setup = await getSetupBySlug(params.username, params.slug);
	if (!setup) throw error(404);
	const files = await getSetupFiles(setup.id);
	const comments = await getSetupComments(setup.id);
	return { setup, files, comments };
};
```

### API route serving CLI

```typescript
// src/routes/api/v1/setups/[id]/files/+server.ts
export const GET: RequestHandler = async ({ params, locals }) => {
	const files = await getSetupFiles(params.id);
	return json({ data: files });
};
```

### Form action for web mutations

```typescript
// src/routes/(public)/[username]/[slug]/+page.server.ts
export const actions = {
	star: async ({ locals, params }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');
		await toggleStar(locals.user.id, params.setupId);
	}
};
```

## Don't

- Don't add any ORM other than Drizzle
- Don't add React or any React-based libraries
- Don't use NextAuth, Auth.js, or any React-centric auth library
- Don't use localStorage for auth tokens in the web app — use HTTP-only cookies via Lucia
- Don't over-engineer: no microservices, no message queues, no Redis (for MVP)
- Don't add WebSocket support yet — polling or SvelteKit invalidation is fine for MVP
- Don't create separate API and frontend projects — SvelteKit handles both
- Don't implement email/password auth — GitHub OAuth only for MVP
- Don't use git to add, commit, or push code - only the user will do that. **Exception:** Ralph worker agents running in CI (`scripts/worker-run.sh`) may commit and push to `claude/*` branches.
- Don't run `pnpm dispatch` or `./scripts/dispatch.sh` — only the user dispatches Ralph. You may create issues for Ralph to pick up, but never trigger the dispatch.

## UI Testing Workflow

After **every UI change**, you must visually verify the result using Playwright screenshots before considering the work done.

### Screenshot Verification

1. Start the dev server (`pnpm dev`) if not already running
2. Use the Playwright CLI to take screenshots at both viewports:
   - **Desktop**: 1280x720 (Playwright's `Desktop Chrome` device)
   - **Mobile**: 430x932 (iPhone 14 Pro Max equivalent)
3. Save screenshots to `screenshots/` (gitignored) with descriptive names, e.g. `setup-detail-desktop.png`, `setup-detail-mobile.png`
4. Review the screenshots visually (read the image files) to confirm the layout, spacing, and content match the plan
5. Fix any visual issues before moving on

Example Playwright CLI commands:

```bash
# Desktop screenshot
npx playwright screenshot --viewport-size=1280,720 http://localhost:5173/some/page screenshots/page-name-desktop.png

# Mobile screenshot
npx playwright screenshot --viewport-size=430,932 http://localhost:5173/some/page screenshots/page-name-mobile.png
```

### Interactive Testing

For pages with user interactions (buttons, forms, toggles, copy actions):

1. First test ad-hoc using Playwright CLI or a quick script to verify behavior in real time
2. Once confirmed working, write a persistent e2e test file colocated with the route (e.g. `page.svelte.e2e.ts`) for regression testing
3. E2e tests should run against both desktop and mobile projects (configured in `playwright.config.ts`)

### Playwright Config

The `playwright.config.ts` defines two projects: `desktop` (Desktop Chrome) and `mobile` (430x932 viewport with `isMobile: true`). All e2e test files match the pattern `**/*.e2e.{ts,js}`.
