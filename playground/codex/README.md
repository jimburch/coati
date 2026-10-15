# Pipedream API — Codex Setup

A Fastify + Drizzle task queue and webhook relay service. This repository ships
a complete OpenAI Codex CLI configuration: project instructions, subagents,
skills, sandboxed config, and MCP servers.

## What's in `.codex/` and `.agents/`

| Path | Purpose |
| --- | --- |
| `.codex/config.toml` | Sandbox, approval policy, MCP servers, per-model defaults |
| `.codex/agents/reviewer.toml` | Subagent for code review against AGENTS.md |
| `.codex/agents/test-writer.toml` | Subagent that writes Vitest tests TDD-style |
| `.codex/agents/security-auditor.toml` | Subagent that audits auth, HMAC verification, and input validation |
| `.codex/agents/migration-planner.toml` | Subagent that plans safe Drizzle migrations |
| `.agents/skills/api-patterns/SKILL.md` | How to write Fastify route plugins |
| `.agents/skills/fastify-plugins/SKILL.md` | Custom Fastify plugin authoring |
| `.agents/skills/drizzle-patterns/SKILL.md` | Drizzle query + migration patterns |
| `.agents/skills/testing/SKILL.md` | Vitest patterns for unit + integration tests |

## MCP servers configured

- `filesystem` — scoped to `./src`
- `postgres` — read-only access to dev database for schema introspection
- `fetch` — HTTP fetch for pulling external API specs
- `github` — PR and issue context

## Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000/docs` for the Swagger UI.
