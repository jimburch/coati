# Architecture

## System Overview

Coati is a monolithic SvelteKit application backed by PostgreSQL, with a separate CLI package that communicates with the app's API routes.

```
┌─────────────────────────────────────────────────┐
│                   Internet                       │
└──────────┬────────────────────┬──────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│   Web Browser    │  │   coati CLI     │
│  (SvelteKit SSR  │  │  (Node.js npm    │
│   + client JS)   │  │   package)       │
└────────┬─────────┘  └────────┬──────────┘
         │                     │
         │  HTML + Forms       │  JSON API
         │                     │  Authorization: Bearer <token>
         ▼                     ▼
┌─────────────────────────────────────────────────┐
│              Caddy (reverse proxy)               │
│              Auto-HTTPS via Let's Encrypt         │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│          SvelteKit Node Server (PM2)             │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ SSR Routes   │  │ API Routes   │               │
│  │ (public)/    │  │ /api/v1/*    │               │
│  │              │  │              │               │
│  │ +page.server │  │ +server.ts   │               │
│  │ +page.svelte │  │ JSON in/out  │               │
│  └──────┬───────┘  └──────┬───────┘               │
│         │                 │                        │
│         ▼                 ▼                        │
│  ┌─────────────────────────────────┐              │
│  │     lib/server/ (shared)        │              │
│  │  ┌───────────┐ ┌─────────────┐  │              │
│  │  │  Lucia    │ │  Drizzle    │  │              │
│  │  │  Auth     │ │  ORM        │  │              │
│  │  └───────────┘ └──────┬──────┘  │              │
│  └───────────────────────┼─────────┘              │
└──────────────────────────┼────────────────────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │    PostgreSQL     │
                 │  (same VPS or    │
                 │   DO Managed)    │
                 └───────────────────┘
```

## Request Flows

### Web: Viewing a Setup Page (SSR)

1. Browser requests `GET /alice/my-claude-workflow`
2. Caddy proxies to SvelteKit Node server
3. SvelteKit matches `(public)/[username]/[slug]/+page.server.ts`
4. `load()` function queries PostgreSQL via Drizzle for setup + files + comments
5. SvelteKit renders `+page.svelte` to HTML on the server
6. Full HTML response sent to browser (great for SEO, social cards)
7. SvelteKit hydrates on the client for interactivity

### Web: Starring a Setup (Form Action)

1. User clicks Star button → `<form method="POST" action="?/star">`
2. SvelteKit matches the `star` form action in `+page.server.ts`
3. Action validates session via `locals.user`, toggles star in DB
4. SvelteKit re-runs `load()` and sends updated data
5. Page updates without full reload (progressive enhancement)

### CLI: Cloning a Setup

1. User runs `coati clone alice/my-claude-workflow`
2. CLI reads auth token from `~/.coati/config.json`
3. CLI sends `GET /api/v1/setups/alice/my-claude-workflow` with Bearer token
4. API returns setup metadata + manifest
5. CLI sends `GET /api/v1/setups/{id}/files` to fetch all file contents
6. CLI checks each target path for conflicts
7. CLI prompts user for conflict resolution (overwrite/skip/backup/diff)
8. CLI writes files to their target locations
9. CLI runs any `postInstall` commands from the manifest
10. CLI sends `POST /api/v1/setups/{id}/clone` to increment clone counter

### CLI: Publishing a Setup

1. User creates a `setup.json` manifest in their project directory
2. User runs `coati publish`
3. CLI reads and validates `setup.json`
4. CLI collects all files referenced in the manifest
5. CLI sends `POST /api/v1/setups` with metadata + files as JSON payload
6. Server validates, stores setup + files in PostgreSQL
7. Setup is now live and browsable on the web

## Authentication Architecture

### Web Sessions (Lucia)

- HTTP-only session cookie set on login
- `hooks.server.ts` validates cookie on every request
- Session data available via `event.locals.user` in all server-side code
- Sessions stored in PostgreSQL `sessions` table managed by Lucia

### CLI Tokens (GitHub Device Flow)

- CLI initiates GitHub device flow via platform's `/api/v1/auth/device` endpoint
- User authorizes on GitHub in their browser
- CLI receives GitHub access token, exchanges it for a platform session token
- Token stored at `~/.coati/config.json`
- Sent as `Authorization: Bearer <token>` on all CLI API requests
- Server validates CLI tokens against the same sessions table

## API Design

All API routes live under `/api/v1/` and return consistent JSON.

### Response Format

```typescript
// Success
{ data: T }

// Error
{ error: "Human-readable message", code: "SETUP_NOT_FOUND" }

// Paginated
{ data: T[], meta: { page: number, perPage: number, total: number } }
```

### Core Endpoints

```
# Setups
GET    /api/v1/setups                     # List/search (query params: q, tool, tag, sort, page)
POST   /api/v1/setups                     # Create setup (auth required)
GET    /api/v1/setups/:owner/:slug        # Get setup by owner/slug
PATCH  /api/v1/setups/:id                 # Update setup (owner only)
DELETE /api/v1/setups/:id                 # Delete setup (owner only)
GET    /api/v1/setups/:id/files           # Get all files (for clone)
POST   /api/v1/setups/:id/star            # Star (auth required)
DELETE /api/v1/setups/:id/star            # Unstar (auth required)
POST   /api/v1/setups/:id/clone           # Record clone event
GET    /api/v1/setups/:id/comments        # List comments
POST   /api/v1/setups/:id/comments        # Add comment (auth required)
GET    /api/v1/setups/trending            # Trending setups

# Users
GET    /api/v1/users/:username            # Get user profile + setups
POST   /api/v1/users/:username/follow     # Follow (auth required)
DELETE /api/v1/users/:username/follow     # Unfollow (auth required)
GET    /api/v1/users/:username/followers  # List followers
GET    /api/v1/users/:username/following  # List following

# Auth
POST   /api/v1/auth/device               # Start device flow (CLI)
POST   /api/v1/auth/device/poll           # Poll for token (CLI)

# Meta
GET    /api/v1/health                     # Health check
```

## Trending Algorithm (MVP)

Simple weighted score, recalculated periodically (cron or on-read with cache):

```
score = (stars * 2) + (clones * 3) + (comments * 1)
decay = hours_since_last_activity / 24
trending_score = score / (1 + decay)
```

Stars are weighted less than clones because a clone represents someone actually using the setup.

## Security Considerations

- All auth tokens stored as HTTP-only cookies (web) or local file with restricted permissions (CLI)
- API rate limiting via simple in-memory counter per IP (upgrade to Redis later if needed)
- Input validation with Zod on all API endpoints
- Setup file contents are stored as text — no executable uploads
- `postInstall` commands in setup.json are displayed to the user for approval before execution (CLI-side)
- SQL injection prevented by Drizzle's parameterized queries
- XSS prevented by SvelteKit's default HTML escaping + markdown sanitization
