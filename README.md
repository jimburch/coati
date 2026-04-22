# Coati

[![Node.js](https://img.shields.io/badge/node-v22%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v10%2B-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-e2e-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Coverage](https://img.shields.io/badge/coverage-88%25-green)](./README.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/support-buy%20me%20a%20coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jimburch)

Share, discover, and clone AI coding workflows.

Coati is a platform where developers publish and install complete AI coding setups — config files, hooks, skills, commands, and scripts — packaged as shareable, installable units. Think GitHub, but for your Claude Code, Cursor, or Copilot configuration.

This repo is **100% open source** under the MIT license. You're welcome to [run your own instance](#self-hosting), [contribute](#contributing), or just use the hosted version at [coati.sh](https://coati.sh).

## How it works

A **setup** is Coati's core entity: a manifest (`coati.json`) plus the config files, scripts, and documentation that define an AI coding workflow. Setups can include:

- **Instructions** — CLAUDE.md files, .cursorrules, system prompts
- **Commands** — slash commands and custom scripts
- **Skills** — reusable agent capabilities
- **MCP Servers** — Model Context Protocol server configs
- **Hooks** — lifecycle hooks for AI coding tools

The workflow is simple:

1. **Publish** your AI coding setup via the CLI or web
2. **Discover** setups through search, trending, and user profiles
3. **Clone** a setup to your machine with a single command

See [`docs/SETUP.md`](docs/SETUP.md) for the full manifest spec and [`docs/UBIQUITOUS_LANGUAGE.md`](docs/UBIQUITOUS_LANGUAGE.md) for the domain glossary.

## Surfaces

### Web app

Browse setups, explore trending configs, follow creators, star your favorites, and leave comments. Public pages are server-rendered for fast loads and SEO; authenticated pages run as a SPA. Teams can share setups within an invite-only workspace.

### CLI (`coati`)

```bash
npm install -g @coati/sh
```

Clone setups to your machine and publish your own from the terminal.

```
coati login                       # Authenticate via GitHub device flow
coati clone alice/mcp-power-setup # Install a setup locally
coati publish                     # Publish a setup to Coati
```

## Tech stack

- **Framework:** SvelteKit 2 (TypeScript, SSR + SPA hybrid)
- **Database:** PostgreSQL 18 + Drizzle ORM
- **Styling:** Tailwind CSS + shadcn-svelte
- **Auth:** Lucia-style sessions + Arctic (GitHub OAuth for web, device flow for CLI)
- **Markdown:** Marked + Shiki syntax highlighting
- **CLI:** Commander, published to npm as `@coati/sh` (built with tsup)
- **Observability:** Sentry (errors + releases), optional Mixpanel (product analytics)
- **Testing:** Vitest (unit + component) + Playwright (e2e, desktop + mobile)
- **Deployment:** Docker image, deployable to any container host (Coolify, Fly, Railway, Render, a bare VPS, etc.)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v22+ (see `.nvmrc`)
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) (for local PostgreSQL)
- A [GitHub OAuth App](https://github.com/settings/developers) (for authentication)

### Getting started

```sh
# Install dependencies
pnpm install

# Copy environment variables and fill in GitHub OAuth credentials
cp .env.example .env

# Start PostgreSQL (dev on :5432, test on :5433)
pnpm db:up

# Run database migrations
pnpm db:migrate

# (Optional) seed the dev database with sample setups
pnpm seed:dev

# Start the dev server
pnpm dev
```

The app will be running at [http://localhost:5173](http://localhost:5173).

### Environment variables

`.env.example` is the source of truth. The full list:

| Variable                | Required     | Description                                                          |
| ----------------------- | ------------ | -------------------------------------------------------------------- |
| `DATABASE_URL`          | yes          | PostgreSQL connection string                                         |
| `DATABASE_URL_TEST`     | dev/CI       | Test database connection string                                      |
| `POSTGRES_USER`         | local Docker | Username for the Docker Postgres container                           |
| `POSTGRES_PASSWORD`     | local Docker | Password for the Docker Postgres container                           |
| `POSTGRES_DB`           | local Docker | Database name for the Docker Postgres container                      |
| `GITHUB_CLIENT_ID`      | yes          | GitHub OAuth app client ID                                           |
| `GITHUB_CLIENT_SECRET`  | yes          | GitHub OAuth app client secret                                       |
| `PUBLIC_SITE_URL`       | yes (prod)   | Canonical site URL used for OG tags and callbacks (e.g. `https://coati.sh`) |
| `PUBLIC_ENV`            | prod         | `staging` or `production`; leave unset locally                       |
| `PUBLIC_BETA_MODE`      | no           | Gate beta-only UI features                                           |
| `PUBLIC_SENTRY_DSN`     | no           | Sentry DSN for error capture (omit to disable)                       |
| `PUBLIC_APP_VERSION`    | no           | Injected at Docker build time from `package.json`                    |
| `PUBLIC_MIXPANEL_TOKEN` | no           | Mixpanel project token (omit to disable analytics)                   |

### Commands

| Command                  | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `pnpm dev`               | Start dev server on localhost:5173                         |
| `pnpm build`             | Production build                                           |
| `pnpm preview`           | Preview production build on :4173                          |
| `pnpm check`             | TypeScript + svelte-check                                  |
| `pnpm lint`              | Prettier check + ESLint                                    |
| `pnpm format`            | Auto-format with Prettier                                  |
| `pnpm test:unit`         | Vitest unit + component tests                              |
| `pnpm test:coverage`     | Unit tests with coverage report                            |
| `pnpm test:e2e`          | Playwright e2e tests (desktop + mobile)                    |
| `pnpm test`              | Unit + e2e                                                 |
| `pnpm ci:checks`         | Full CI pipeline: check + lint + test:unit                 |
| `pnpm db:up`             | Start local PostgreSQL via Docker                          |
| `pnpm db:down`           | Stop local PostgreSQL                                      |
| `pnpm db:generate`       | Generate a new Drizzle migration from schema changes       |
| `pnpm db:migrate`        | Apply pending migrations to the dev database               |
| `pnpm db:migrate:test`   | Apply migrations to the test database                      |
| `pnpm seed:dev`          | Seed the dev database with sample data                     |

### Testing

Unit and component tests use Vitest across two projects: a `client` project (browser-mode Svelte component tests) and a `server` project (Node).

End-to-end tests use Playwright across two viewports:

- **Desktop** — 1280x720 (Chrome)
- **Mobile** — 430x932 (iPhone 14 Pro Max equivalent)

```sh
pnpm test:unit    # Unit + component
pnpm test:e2e     # E2e across both viewports
```

E2e test files are colocated with routes and match the pattern `**/*.e2e.{ts,js}`. The e2e runner builds and previews the app on port `4173`.

## Project structure

```
coati/
├── src/
│   ├── lib/
│   │   ├── server/           # Auth, database, queries
│   │   │   ├── db/           # Drizzle client + schema
│   │   │   └── queries/      # Reusable query functions
│   │   ├── components/       # Shared Svelte components + shadcn-svelte UI
│   │   ├── types/            # Shared TypeScript types
│   │   └── utils/            # Validation, markdown, slugs
│   └── routes/
│       ├── (public)/         # SSR-enabled pages (explore, profiles, setup detail)
│       ├── (app)/            # SPA authenticated pages (new setup, settings, feed, teams)
│       ├── api/v1/           # JSON API (serves both CLI and web)
│       └── auth/             # GitHub OAuth flow
├── cli/                      # CLI tool (separate workspace package, published as `@coati/sh`)
├── packages/
│   ├── agents-registry/      # Shared: agent definitions + file globs
│   └── validation/           # Shared: Zod schemas + enums
├── docs/                     # Architecture, data model, CLI spec, deployment guide
├── drizzle/                  # Database migrations
├── scripts/                  # Dev scripts: seed, coverage, deploy entrypoint
├── caddy/                    # Caddy reverse proxy config (self-host reference)
└── playwright/               # E2e test support files
```

## API

All API routes live under `/api/v1/` and return consistent JSON:

```json
// Success
{ "data": { ... } }

// Error
{ "error": "message", "code": "ERROR_CODE" }
```

Selected endpoints (see `src/routes/api/v1/` for the complete list):

| Endpoint                                         | Methods            | Description              |
| ------------------------------------------------ | ------------------ | ------------------------ |
| `/api/v1/setups`                                 | GET, POST          | List/search, create      |
| `/api/v1/setups/[owner]/[slug]`                  | GET, PATCH, DELETE | Setup CRUD               |
| `/api/v1/setups/[owner]/[slug]/files`            | GET                | Get files (for clone)    |
| `/api/v1/setups/[owner]/[slug]/clone`            | POST               | Record clone + get files |
| `/api/v1/setups/[owner]/[slug]/star`             | POST, DELETE       | Star / unstar            |
| `/api/v1/setups/[owner]/[slug]/comments`         | GET, POST          | Comments                 |
| `/api/v1/teams`                                  | GET, POST          | List/create teams        |
| `/api/v1/teams/[slug]/members`                   | GET, POST          | Team membership          |
| `/api/v1/teams/[slug]/invites`                   | GET, POST          | Team invites             |
| `/api/v1/users/[username]`                       | GET                | User profile             |
| `/api/v1/users/[username]/follow`                | POST, DELETE       | Follow / unfollow        |
| `/api/v1/search`                                 | GET                | Global search            |
| `/api/v1/feed`                                   | GET                | Activity feed            |
| `/api/v1/auth/device`                            | POST               | CLI device auth start    |
| `/api/v1/auth/device/poll`                       | POST               | CLI device auth poll     |
| `/api/v1/health`                                 | GET                | Health check             |

## Auth

- **Web:** GitHub OAuth via Arctic. Session cookie set on callback, validated in `hooks.server.ts`.
- **CLI:** GitHub device flow. User runs `coati login`, authorizes in browser, token saved to `~/.coati/config.json` and sent as `Authorization: Bearer <token>`.

See [`docs/AUTH.md`](docs/AUTH.md) for the full flow.

## Self-hosting

Coati ships as a single Docker image and a Postgres database. You can run your own instance on any container host.

### What you need

- A host that can run Docker containers (VPS, Fly, Railway, Render, Coolify, Kubernetes, etc.)
- A PostgreSQL 18 database (managed or self-hosted)
- A domain pointing at your host, with TLS termination (Traefik, Caddy, Cloudflare, your host's built-in proxy, etc.)
- A [GitHub OAuth App](https://github.com/settings/developers) with the callback URL set to `https://your-domain/auth/callback/github`

### Build the image

```sh
docker build \
  --build-arg APP_VERSION=$(node -p "require('./package.json').version") \
  -t coati:latest .
```

The multi-stage `Dockerfile` produces a Node 22 Alpine runtime image that runs as an unprivileged `app` user, copies Drizzle migrations for on-demand application, and exposes a health check at `/api/v1/health`.

### Run the container

Provide the environment variables documented above (at minimum: `DATABASE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `PUBLIC_SITE_URL`, `PUBLIC_ENV=production`). Migrations run automatically on container start via `scripts/docker-entrypoint.sh`.

```sh
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://... \
  -e GITHUB_CLIENT_ID=... \
  -e GITHUB_CLIENT_SECRET=... \
  -e PUBLIC_SITE_URL=https://your-domain \
  -e PUBLIC_ENV=production \
  coati:latest
```

The reference deployment runs on Coolify with Traefik as the reverse proxy. A sample Caddy config is included in `caddy/` if you prefer Caddy. For a full walkthrough of the reference VPS + Coolify setup, see [`docs/TEST-ENV-SETUP.md`](docs/TEST-ENV-SETUP.md).

### Upgrading

Pull the latest image, restart the container, and migrations apply automatically. Releases are tagged via semantic-release on `main`; watch the repo or subscribe to GitHub releases to track new versions.

## Contributing

Contributions are welcome — bug reports, feature ideas, and PRs.

### Reporting issues

- Search [existing issues](https://github.com/jimburch/coati/issues) first
- Include reproduction steps, expected vs actual behavior, and your environment
- For security issues, please email `jim@showit.com` instead of opening a public issue

### Submitting a PR

1. Fork the repo and create a branch from `develop` (PRs target `develop`, not `main`)
2. Make your changes following the conventions below
3. Run the full CI pipeline locally: `pnpm ci:checks`
4. Open a PR against `develop` with a clear description of the change and why

### Coding conventions

- TypeScript strict mode everywhere
- `const` over `let`; never `var`
- Drizzle query builder over raw SQL
- API responses follow `{ data }` / `{ error, code }` shape
- Shared Zod schemas in `packages/validation`
- shadcn-svelte primitives only — don't add new UI libraries
- Use the canonical domain terms from [`docs/UBIQUITOUS_LANGUAGE.md`](docs/UBIQUITOUS_LANGUAGE.md) (e.g. **Setup** not "workflow")

See [`CLAUDE.md`](CLAUDE.md) for the complete project conventions — it's written for AI coding agents but is an accurate guide for humans too.

### Issue labels

- `ralph` — tasks queued for an automated worker agent (see `scripts/dispatch.sh`). If you'd rather pick one up yourself, comment on the issue so nobody duplicates the work.
- `HITL` (human-in-the-loop) — tasks the automated worker couldn't finish and that need manual review. These are a great place to contribute.
- `good first issue` — scoped starter tasks

### Commit style

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.). semantic-release uses these to generate changelogs and version bumps, so please follow the convention on `develop` and `main`.

## Support

Coati is free and open source. If it's useful to you, you can support development at [buymeacoffee.com/jimburch](https://buymeacoffee.com/jimburch), [star the repo](https://github.com/jimburch/coati), or share a setup you've built. See [coati.sh/support](https://coati.sh/support) for more ways to help.

## License

MIT
