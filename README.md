# Coati

[![Node.js](https://img.shields.io/badge/node-v20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v10%2B-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-e2e-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Coverage](https://img.shields.io/badge/coverage-88%25-green)](./README.md)
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/support-buy%20me%20a%20coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jimburch)

Share, discover, and clone AI coding workflows.

Coati is a platform where developers publish and install complete AI coding setups — config files, hooks, skills, commands, and scripts — packaged as shareable, installable units. Think GitHub, but for your Claude Code, Cursor, or Copilot configuration.

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

## Surfaces

### Web app

Browse setups, explore trending configs, follow creators, star your favorites, and leave comments. Public pages are server-rendered for fast loads and SEO; authenticated pages run as a SPA.

### CLI (`coati`)

```bash
npm install -g coati
```

Clone and install setups locally, publish your own, search and interact from the terminal.

```
coati login                          # Authenticate via GitHub
coati search "claude mcp typescript" # Find setups by keyword
coati clone alice/mcp-power-setup    # Install a setup locally
coati init                           # Create a new setup from your config
coati publish                        # Publish to Coati
coati star alice/mcp-power-setup     # Star a setup
```

## Tech stack

- **Framework:** SvelteKit (TypeScript, SSR + SPA hybrid)
- **Database:** PostgreSQL 17 + Drizzle ORM
- **Styling:** Tailwind CSS + shadcn-svelte
- **Auth:** Lucia v3 + Arctic (GitHub OAuth)
- **Markdown:** Marked + Shiki syntax highlighting
- **CLI:** Commander (published to npm as `coati`)
- **Testing:** Vitest (unit) + Playwright (e2e)

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v20+ (see `.nvmrc`)
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
pnpm run db:up

# Run database migrations
pnpm drizzle-kit migrate

# Start the dev server
pnpm run dev
```

The app will be running at [http://localhost:5173](http://localhost:5173).

### Environment variables

| Variable               | Description                    |
| ---------------------- | ------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection string   |
| `DATABASE_URL_TEST`    | Test database connection       |
| `GITHUB_CLIENT_ID`     | GitHub OAuth app client ID     |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |

### Commands

| Command              | Description                             |
| -------------------- | --------------------------------------- |
| `pnpm run dev`       | Start dev server on localhost:5173      |
| `pnpm run build`     | Production build                        |
| `pnpm run preview`   | Preview production build                |
| `pnpm run check`     | TypeScript type checking                |
| `pnpm run lint`      | ESLint + Prettier                       |
| `pnpm run format`    | Auto-format with Prettier               |
| `pnpm run test:unit` | Vitest unit tests                       |
| `pnpm run test:e2e`  | Playwright e2e tests (desktop + mobile) |
| `pnpm run db:up`     | Start local PostgreSQL via Docker       |
| `pnpm run db:down`   | Stop local PostgreSQL                   |

### Testing

Unit tests use Vitest. End-to-end tests use Playwright with two projects:

- **Desktop** — 1280x720 (Chrome)
- **Mobile** — 430x932 (iPhone 14 Pro Max equivalent)

```sh
pnpm run test:unit    # Run unit tests
pnpm run test:e2e     # Run e2e tests against both viewports
```

E2e test files are colocated with routes and match the pattern `**/*.e2e.{ts,js}`.

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
│       ├── (app)/            # SPA authenticated pages (new setup, settings, feed)
│       ├── api/v1/           # JSON API (serves both CLI and web)
│       └── auth/             # GitHub OAuth flow
├── cli/                      # CLI tool (separate pnpm workspace package)
│   ├── src/commands/         # login, logout, clone, init, publish, search, view, star
│   └── bin/coati.js          # Bin entry
├── docs/                     # Architecture, data model, CLI spec
├── drizzle/                  # Database migrations
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

Key endpoints:

| Endpoint                          | Methods            | Description           |
| --------------------------------- | ------------------ | --------------------- |
| `/api/v1/setups`                  | GET, POST          | List/search, create   |
| `/api/v1/setups/[id]`             | GET, PATCH, DELETE | Setup CRUD            |
| `/api/v1/setups/[id]/files`       | GET                | Get files (for clone) |
| `/api/v1/setups/[id]/star`        | POST, DELETE       | Star/unstar           |
| `/api/v1/setups/[id]/comments`    | GET, POST          | Comments              |
| `/api/v1/setups/trending`         | GET                | Trending setups       |
| `/api/v1/users/[username]`        | GET                | User profile          |
| `/api/v1/users/[username]/follow` | POST, DELETE       | Follow/unfollow       |
| `/api/v1/auth/device`             | POST               | CLI device auth flow  |

## Auth

- **Web:** GitHub OAuth via Lucia + Arctic. Session cookie set on callback, validated in `hooks.server.ts`.
- **CLI:** GitHub Device Flow. User runs `coati login`, authorizes in browser, token saved to `~/.coati/config.json` and sent as `Authorization: Bearer <token>`.

## Support

Coati is free and open source. If it's useful to you, you can support development at [buymeacoffee.com/jimburch](https://buymeacoffee.com/jimburch), [star the repo](https://github.com/jimburch/coati), or share a setup you've built. See [coati.sh/support](https://coati.sh/support) for more ways to help.

## License

ISC
