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
- [ ] Initialize SvelteKit project with TypeScript
- [ ] Set up Tailwind CSS + shadcn-svelte
- [ ] Configure Drizzle ORM + PostgreSQL connection
- [ ] Define database schema (`schema.ts`) for all tables
- [ ] Run initial migration
- [ ] Set up Lucia Auth v3 + Arctic
- [ ] Implement GitHub OAuth flow (web): login + callback routes
- [ ] Create `hooks.server.ts` for session validation
- [ ] Build basic layout: navbar (logo, search bar, login/avatar), footer
- [ ] User profile page (read-only): `(public)/[username]/+page.svelte`
- [ ] Setup CRUD API routes:
  - `POST /api/v1/setups` — create
  - `GET /api/v1/setups/:owner/:slug` — read
  - `PATCH /api/v1/setups/:id` — update
  - `DELETE /api/v1/setups/:id` — delete
- [ ] Setup files API: `GET /api/v1/setups/:id/files`

### Milestone: Can log in with GitHub, create a setup via API, view it at a URL

---

## Week 2: Core Web Experience

**Goal:** Setup pages look great, file browsing works, you can explore

### Tasks
- [ ] Setup detail page (`(public)/[username]/[slug]/+page.svelte`):
  - README rendered as markdown (mdsvex + shiki)
  - Metadata sidebar: tools, tags, star count, clone count, author
  - "Clone this setup" section showing CLI command
  - Link to author profile
- [ ] File browser component:
  - File tree (left sidebar or tab list)
  - File content viewer with syntax highlighting (shiki)
  - Target path displayed per file
- [ ] Explore page (`(public)/explore/+page.svelte`):
  - Search bar (PostgreSQL full-text search)
  - Filter by tool (dropdown/chips)
  - Filter by tag
  - Sort: trending, most stars, most clones, newest
  - Paginated results grid (SetupCard components)
- [ ] SetupCard component: name, description, tools icons, star count, clone count, author avatar
- [ ] Landing page (`(public)/+page.svelte`):
  - Hero: tagline + CTA
  - Trending setups grid
  - "How it works" section (share → discover → clone)
- [ ] Setup creation page (`(app)/new/+page.svelte`):
  - Form: name, description, tools, tags
  - README editor (textarea with markdown preview)
  - File manager: add files, set path + target_path + placement + description
  - Publish button

### Milestone: Can create a setup via web UI, browse it, see it on explore page

---

## Week 3: Social Features + CLI Foundation

**Goal:** Stars, follows, comments work. CLI can authenticate and search.

### Tasks
- [ ] Star system:
  - StarButton component (optimistic UI)
  - Form action in setup detail page
  - API route: `POST/DELETE /api/v1/setups/:id/star`
  - Denormalized count update in transaction
- [ ] Follow system:
  - FollowButton component
  - API route: `POST/DELETE /api/v1/users/:username/follow`
  - Followers/following counts on user profile
- [ ] Comments:
  - CommentThread component (single-level threading)
  - Form action for posting comments
  - API route: `GET/POST /api/v1/setups/:id/comments`
  - Markdown rendering in comment bodies
- [ ] CLI project scaffold:
  - `cli/` directory with its own `package.json`
  - Commander setup with command structure
  - API client module (`api.ts`)
  - Config module (`config.ts` — read/write `~/.magpie/config.json`)
- [ ] CLI auth:
  - GitHub Device Flow endpoint: `POST /api/v1/auth/device`
  - Polling endpoint: `POST /api/v1/auth/device/poll`
  - `magpie login` command
  - `magpie logout` command
- [ ] CLI search:
  - `magpie search <query>` — calls explore API, formats results
  - `magpie trending` — calls trending API
  - `magpie view <owner>/<slug>` — calls setup detail API

### Milestone: Can star/follow/comment on web. CLI can login and search.

---

## Week 4: CLI Clone + Publish

**Goal:** The flagship features — clone a setup from CLI, publish a setup from CLI

### Tasks
- [ ] `magpie clone <owner>/<slug>`:
  - Fetch setup + files from API
  - Resolve target paths (expand `~`, `./`)
  - Conflict detection (check existing files)
  - Interactive prompts: overwrite / skip / backup / diff
  - Write files to disk
  - Post-install command execution (with confirmation)
  - Clone event recording (API call)
  - `--dry-run`, `--force`, `--pick` flags
- [ ] `magpie init`:
  - Auto-detect common AI config files in cwd
  - Interactive prompts for name, description, tools, tags
  - File mapping prompts for each detected file
  - Generate `setup.json`
- [ ] `magpie publish`:
  - Read and validate `setup.json` (Zod schema)
  - Collect referenced files
  - `POST /api/v1/setups` with full payload
  - `--update` flag for updating existing setups
- [ ] `magpie star/unstar` and `magpie follow/unfollow`
- [ ] Validate `setup.json` schema with Zod (shared between CLI and server)

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
- [ ] Publish `magpie` CLI to npm
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