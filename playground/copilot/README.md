# Ledger — GitHub Copilot Setup

A multi-tenant expense management SaaS built with Next.js 15, Prisma, and
tRPC. This repository ships a complete GitHub Copilot configuration:
repository instructions, specialized agents, prompt library, firewall rules,
MCP servers, and VS Code settings.

## What's in `.github/copilot/`

| Path | Purpose |
| --- | --- |
| `../copilot-instructions.md` | Repo-wide rules Copilot sees on every interaction |
| `agents.json` | Named agents (reviewer, architect, migrator, debugger, refactorer) |
| `firewall.json` | Network allow-list for Copilot Coding Agent runs |
| `mcp.json` | MCP servers available to Copilot (filesystem, postgres, github, inngest) |
| `instructions.md` | Task-specific instructions layered on top of the repo-wide ones |
| `prompts/review.md` | Prompt template for reviewing a PR |
| `prompts/refactor.md` | Prompt template for extracting a tRPC procedure |
| `prompts/test-generation.md` | Prompt template for generating Vitest tests |
| `prompts/prisma-migration.md` | Prompt template for planning a Prisma migration |
| `prompts/trpc-procedure.md` | Prompt template for scaffolding a new tRPC procedure |
| `prompts/rsc-pattern.md` | Prompt template for converting a Client → Server Component |
| `setup.sh` | Dev-environment bootstrap for Copilot Coding Agent |

## What's in `.vscode/`

`settings.json` locks down Copilot's behavior to match the repo conventions:
excluded paths, preferred model, chat agents, and inline suggestion settings.

## Getting started

```bash
pnpm install
cp .env.example .env
docker compose up -d db
pnpm db:migrate:dev
pnpm dev
```
