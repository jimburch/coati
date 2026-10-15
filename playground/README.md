# Playground

Reference implementations for each supported AI coding agent. Used for testing the CLI's file detection, `node ../../cli/bin/coati.js init`, `node ../../cli/bin/coati.js clone`, and `node ../../cli/bin/coati.js publish` workflows.

## Setup

All commands below assume you're running the local CLI from within a playground subdirectory. From any playground directory, the CLI entry point is:

```bash
node ../../cli/bin/coati.js <command>
```

## Single-Agent Directories

Each directory contains a realistic, fully fleshed-out project-level setup for one agent. Each one targets a different web-dev archetype so the configurations showcase how each agent's features map to a real stack. **None of these have a `coati.json`** — they're designed for testing `node ../../cli/bin/coati.js init` auto-detection.

| Directory      | Agent          | Project archetype                              | Key Config Files                                      |
| -------------- | -------------- | ---------------------------------------------- | ----------------------------------------------------- |
| `claude-code/` | Claude Code    | SvelteKit SaaS (Linkly — link shortener)       | `CLAUDE.md`, `.claude/`, `.mcp.json`                  |
| `codex/`       | Codex CLI      | Fastify + Drizzle API (Pipedream — webhook relay) | `AGENTS.md`, `.codex/`, `.agents/`                 |
| `copilot/`     | GitHub Copilot | Next.js 15 + Prisma + tRPC (Ledger — expense SaaS) | `.github/copilot-instructions.md`, `.github/copilot/`, `.vscode/` |
| `cursor/`      | Cursor         | React + Vite + Storybook component library (Atlas UI) | `.cursorrules`, `.cursor/rules/*.mdc`, `.cursor/` |
| `gemini/`      | Gemini CLI     | Astro + MDX content site (Beacon Docs)         | `GEMINI.md`, `.gemini/`, `.geminiignore`              |
| `opencode/`    | OpenCode       | Nuxt 3 + Pinia SPA (Kite Analytics)            | `opencode.md`, `.opencode.json`, `.opencode/`         |

Each setup is opinionated and showcases the agent's signature features: Claude Code's hooks + subagents + skills + statusline, Codex's TOML subagents + sandboxed config, Copilot's firewall + agents.json + .vscode integration, Cursor's scoped `.mdc` rules with globs + hooks, Gemini's TOML commands + shell policies, and OpenCode's provider fallbacks + contextPaths.

### Testing `node ../../cli/bin/coati.js init`

```bash
cd playground/claude-code   # or any single-agent directory
node ../../cli/bin/coati.js init
```

Expected behavior:

1. Scanner detects all config files for that agent
2. Reports detected agent and file count (e.g., "Found config files for: Claude Code (9 files)")
3. Tags each file with the correct agent slug
4. Writes a valid `coati.json` with the `agents` array pre-populated

Verify: the generated `coati.json` should list only the one agent and tag every file with it.

## Multi-Agent Directory

`multi/` — A project-level setup (Compose — collaborative note-taking on SvelteKit) targeting **Claude Code + Cursor** simultaneously, with a **lane split**: Claude owns the backend (server routes, DB, auth); Cursor owns the frontend (components, styling, forms). Includes PreToolUse hooks on both sides that enforce the lane boundaries.

### Testing multi-agent init

```bash
cd playground/multi
rm coati.json              # remove the reference manifest
node ../../cli/bin/coati.js init
```

Expected behavior:

1. Detects files for both Claude Code and Cursor
2. Reports both agents (e.g., "Found config files for: Claude Code (9 files), Cursor (12 files)")
3. Tags each file with its agent; shared files (`package.json`, `README.md`) have no agent tag
4. Pre-populates `agents: ["claude-code", "cursor"]`

### Testing multi-agent clone

```bash
node ../../cli/bin/coati.js clone <owner>/multi-setup
```

Expected behavior:

1. Auto-detects which agents the user has installed locally
2. If both detected, prompts: "This setup supports Claude Code, Cursor. Install files for which?"
3. Installs only selected agent's files plus shared files
4. `--agent cursor` flag overrides auto-detection

## Clean Directory (No Agent Config)

`clean/` — A realistic TypeScript project with **zero AI agent config files**. No `CLAUDE.md`, no `.cursorrules`, no `coati.json` — just a plain Express app. Designed for testing fresh `coati clone` workflows.

### Testing fresh clone

```bash
cd playground/clean
pnpm coati clone <owner>/<slug>
```

Expected behavior:

1. No agents detected locally (no config files present)
2. Full clone flow runs from scratch
3. Agent config files land in the project directory

### Resetting after a clone

```bash
pnpm reset
```

This restores the directory to its committed state — removes all files added by the clone and reverts any modifications. Run this between clone tests for a clean slate.

## User/Global Directory

`user/` — A "polyglot dotfiles" global setup that installs to home directories (`~/`), targeting **Claude Code + Gemini + Codex**. Provides a consistent personality across all three agents: same `/commit`, `/pr`, `/standup` commands in both Claude (Markdown) and Gemini (TOML) forms, matching personal preferences in CLAUDE.md and AGENTS.md, and shared deny-lists for destructive commands.

### Testing global clone behavior

```bash
node ../../cli/bin/coati.js clone <owner>/user-setup
```

Expected behavior:

1. Detects installed agents via home directory and PATH checks
2. Prompts for agent selection if multiple match
3. Prompts for installation scope — default should be "global" (from manifest `placement`)
4. Installs files to home directory paths (e.g., `~/.claude/settings.json`)

## Testing `node ../../cli/bin/coati.js publish` validation

From any directory with a `coati.json`:

```bash
cd playground/multi
node ../../cli/bin/coati.js publish
```

The publish command validates agent references before uploading:

- Every file's `agent` field must reference a known agent slug
- The `agents` array must include every agent referenced in file entries
- On mismatch, warns and offers to auto-fix

To test validation errors, edit `coati.json` to introduce a mismatch (e.g., remove an agent from the `agents` array while keeping file references to it).
