# MVP Plan — 4-6 Week Build

## Guiding Principles

- Ship the smallest thing that demonstrates the core value: share → discover → clone
- Don't build features nobody has asked for yet
- Prioritize the CLI clone experience — that's the magic moment
- Seed with real setups before launch — an empty platform is a dead platform
- Good enough SSR + SEO on day one beats perfect SSR in month two

## Week 1: Foundation

**Goal:** Project scaffold, database, auth, basic CRUD

### Tasks

- [x] Initialize SvelteKit project with TypeScript
- [x] Set up Tailwind CSS + shadcn-svelte
- [x] Configure Drizzle ORM + PostgreSQL connection
- [x] Define database schema (`schema.ts`) for all tables
- [x] Run initial migration
- [x] Add shared types and Zod validation schemas
- [x] Build health check API endpoint (`/api/v1/health`)
- [x] Add consistent API response helpers (`success` / `error`)
- [x] Verify full stack works (dev server + health endpoint + all tests pass)
- [x] Set up auth (Copenhagen Book + Arctic)
- [x] Implement GitHub OAuth flow (web): login + callback routes
- [x] Create `hooks.server.ts` for session validation
- [x] Build basic layout: navbar (logo, search bar, login/avatar), footer
- [x] User profile page (read-only): `(public)/[username]/+page.svelte`
- [x] Setup CRUD API routes:
  - `POST /api/v1/setups` — create
  - `GET /api/v1/setups/:owner/:slug` — read
  - `PATCH /api/v1/setups/:owner/:slug` — update
  - `DELETE /api/v1/setups/:owner/:slug` — delete
- [x] Setup files API: `GET /api/v1/setups/:owner/:slug/files`

### Milestone: Can log in with GitHub, create a setup via API, view it at a URL (COMPLETE)

---

## Week 2: Core Web Experience

**Goal:** Setup pages look great, file browsing works, you can explore

### Tasks

- [x] Setup detail page (`(public)/[username]/[slug]/+page.svelte`):
  - README rendered as markdown (mdsvex + shiki)
  - Metadata sidebar: tools, tags, star count, clone count, author
  - "Clone this setup" section showing CLI command
  - Link to author profile
- [x] File browser component:
  - File tree (left sidebar or tab list)
  - File content viewer with syntax highlighting (shiki)
  - Target path displayed per file
- [x] Explore page (`(public)/explore/+page.svelte`):
  - Search bar (PostgreSQL full-text search)
  - Filter by tool (dropdown/chips)
  - Filter by tag
  - Sort: trending, most stars, most clones, newest
  - Paginated results grid (SetupCard components)
- [x] SetupCard component: name, description, tools icons, star count, clone count, author avatar
- [x] Landing page (`(public)/+page.svelte`):
  - Hero: tagline + CTA
  - Trending setups grid
  - "How it works" section (share → discover → clone)
- [x] Setup creation page (`(app)/new/+page.svelte`):
  - Form: name, description, tools, tags
  - README editor (textarea with markdown preview)
  - File manager: add files, set path + target_path + placement + description
  - Publish button

### Milestone: Can create a setup via web UI, browse it, see it on explore page

---

## Week 3: Social Features + CLI Foundation

**Goal:** Stars, follows, comments work. CLI can authenticate.

### Tasks

- [x] Star system:
  - StarButton component (optimistic UI)
  - Form action in setup detail page
  - API route: `POST/DELETE /api/v1/setups/:id/star`
  - Denormalized count update in transaction
- [x] Follow system:
  - FollowButton component
  - API route: `POST/DELETE /api/v1/users/:username/follow`
  - Followers/following counts on user profile
- [x] Comments:
  - CommentThread component (single-level threading)
  - Form action for posting comments
  - API route: `GET/POST /api/v1/setups/:id/comments`
  - Markdown rendering in comment bodies
- [x] CLI project scaffold:
  - `cli/` directory with its own `package.json`
  - Commander setup with command structure
  - API client module (`api.ts`)
  - Config module (`config.ts` — read/write `~/.coati/config.json`)
- [x] CLI auth:
  - GitHub Device Flow endpoint: `POST /api/v1/auth/device`
  - Polling endpoint: `POST /api/v1/auth/device/poll`
  - `coati login` command
  - `coati logout` command
- ~CLI search (descoped — discovery features belong on web, not CLI):~
  - ~`coati search <query>`~
  - ~`coati trending`~
  - ~`coati view <owner>/<slug>`~

### Milestone: Can star/follow/comment on web. CLI can login. (COMPLETE)

---

## Week 4: CLI Clone + Publish

**Goal:** The flagship features — clone a setup from CLI, publish a setup from CLI

### Tasks

- [x] `coati clone <owner>/<slug>`:
  - Fetch setup + files from API
  - Interactive prompt: install to current directory or globally
  - Resolve target paths (expand `~`, `./`)
  - Conflict detection (check existing files)
  - Interactive prompts: overwrite / skip / backup / diff
  - Write files to disk
  - Post-install command execution (with confirmation)
  - Clone event recording (API call)
  - `--dry-run`, `--force`, `--pick`, `--dir` flags
- [x] `coati init`:
  - Auto-detect existing AI config files in cwd (`.claude/`, `.cursor/`, etc.)
  - Confirm detected files with user, prompt for name/description/tools/tags
  - Generate `setup.json` manifest from detected files
- [x] `coati publish`:
  - Auto-run `init` flow if no `setup.json` exists
  - Read and validate `setup.json` (Zod schema)
  - Collect referenced files
  - Create or update setup on platform (determined by owner/slug match)
  - `POST /api/v1/setups` for new, `PATCH` for existing
- ~`coati star/unstar` and `coati follow/unfollow` (descoped — social features are web-only)~
- [x] Validate `setup.json` schema with Zod (shared between CLI and server)

### Milestone: Full publish → discover → clone loop works end-to-end

---

## Week 5: Polish + Activity Feed

**Goal:** Make it feel finished. Activity feed, better profiles, edge cases.

### Tasks

- [ ] Activity feed (`(app)/feed/+page.svelte`):
  - Show recent activity from followed users (new setups, updates)
  - Simple chronological list for MVP
- [ ] User profile enhancements:
  - Edit bio, website
  - "Starred setups" tab
  - Setup count, follower/following counts
- [ ] Setup detail enhancements:
  - Open Graph meta tags for social sharing (title, description, image)
  - "Copy CLI command" button
  - Related setups (same tools/tags) — simple query
- [ ] Settings page (`(app)/settings/+page.svelte`):
  - Edit profile info
  - View/revoke CLI sessions
- [ ] Error handling pass:
  - 404 pages for missing users/setups
  - Rate limiting on API (simple in-memory)
  - Input validation everywhere (Zod)
  - Loading states and error states in UI
- [ ] Mobile responsiveness pass

### Milestone: Platform feels complete and polished for launch

---

## Week 6: Deploy + Launch

**Goal:** Ship it

### Tasks

- [ ] Set up DigitalOcean Droplet
- [ ] Install PostgreSQL, Caddy, PM2, Node.js
- [ ] Configure Caddy for HTTPS + reverse proxy
- [ ] Set up GitHub Actions CI/CD:
  - Build SvelteKit on push to main
  - SCP build output to droplet
  - Restart PM2 process
- [ ] Database backup cron job
- [ ] Publish `coati` CLI to npm
- [ ] Seed platform with 5-10 real setups:
  - Your own Claude Code setup
  - A minimal starter setup
  - An MCP power-user setup
  - A Cursor + Claude hybrid setup
  - Ask 2-3 dev friends to create setups
- [ ] Write getting-started guide / docs
- [ ] Launch:
  - Hacker News "Show HN" post
  - r/ClaudeCode, r/cursor Reddit posts
  - Twitter/X thread with demo GIF
  - DEV.to launch article

---

## Explicitly NOT in MVP

These are real features but building them now would blow the timeline:

- **Version history / diffing** — setups have one "current" state
- **Private setups** — everything is public
- **Forking** — users clone and re-publish as their own
- **Notifications** — no email or in-app notifications
- **Teams / orgs** — individual accounts only
- **Git integration** — no push/pull workflow, just publish via CLI or web
- **VS Code / Cursor extension** — CLI only
- **AI recommendations** — simple trending + search is enough
- **Analytics dashboard** — just counts on the setup page
- **Import from GitHub** — manual creation only
- **Setup composition** — can't merge multiple setups
- **Comments editing/deletion** — create-only for MVP
- **Email/password auth** — GitHub OAuth only
