# Linkly — Claude Code Setup

A self-hosted link shortener built with SvelteKit, Drizzle, and Lucia Auth.
This repository ships a complete Claude Code configuration: project memory,
permissions, hooks, subagents, commands, skills, and MCP servers.

## What's in `.claude/`

| Path | Purpose |
| --- | --- |
| `settings.json` | Permissions, default model, statusline, environment |
| `hooks/pre-commit.sh` | Lint + type-check + related tests before commit |
| `hooks/post-tool-use.sh` | Auto-format TypeScript/Svelte files after edits |
| `hooks/user-prompt-submit.sh` | Blocks prompts containing API keys or secrets |
| `hooks/session-start.sh` | Prints a concise project snapshot at session start |
| `agents/route-writer.md` | Subagent that scaffolds SvelteKit routes |
| `agents/drizzle-migrator.md` | Subagent that plans safe schema migrations |
| `agents/security-reviewer.md` | Subagent that audits auth and rate-limit code |
| `commands/review.md` | Review staged changes against project conventions |
| `commands/test-coverage.md` | Gap-analyze tests for changed files |
| `commands/add-route.md` | Scaffold a new SvelteKit route with the right boilerplate |
| `commands/migrate.md` | Generate and apply a Drizzle migration safely |
| `commands/a11y-check.md` | Run an accessibility audit against the dev server |
| `skills/sveltekit-routes/` | How to write load functions, form actions, endpoints |
| `skills/drizzle-queries/` | Patterns for Drizzle queries, joins, and transactions |
| `skills/lucia-auth/` | Auth middleware, sessions, API keys |
| `skills/shadcn-svelte/` | Adding and customizing shadcn-svelte components |
| `output-styles/concise.md` | Output style that skips preamble and summary |
| `statusline.sh` | Statusline showing git branch + uncommitted count |

## MCP Servers

`.mcp.json` configures four servers:

- **filesystem** — scoped to `./src` for safe edits
- **postgres** — read-only access to the local dev database
- **playwright** — drive the e2e browser from Claude
- **github** — pull issue/PR context into the session

Set `GITHUB_TOKEN` and `DATABASE_URL` in your shell before launching Claude.

## Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate
pnpm dev
```
