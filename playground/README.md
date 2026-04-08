# Playground

Reference implementations for each supported AI coding agent. Used for testing the CLI's file detection, `node ../../cli/bin/coati.js init`, `node ../../cli/bin/coati.js clone`, and `node ../../cli/bin/coati.js publish` workflows.

## Setup

All commands below assume you're running the local CLI from within a playground subdirectory. From any playground directory, the CLI entry point is:

```bash
node ../../cli/bin/coati.js <command>
```

## Single-Agent Directories

Each directory contains a realistic project-level setup for one agent. **None of these have a `coati.json`** — they're designed for testing `node ../../cli/bin/coati.js init` auto-detection.

| Directory      | Agent          | Key Config Files                                      |
| -------------- | -------------- | ----------------------------------------------------- |
| `claude-code/` | Claude Code    | `CLAUDE.md`, `.claude/`, `.mcp.json`                  |
| `codex/`       | Codex CLI      | `AGENTS.md`, `.codex/`, `.agents/`                    |
| `copilot/`     | GitHub Copilot | `.github/copilot-instructions.md`, `.github/copilot/` |
| `cursor/`      | Cursor         | `.cursorrules`, `.cursor/rules/*.mdc`, `.cursor/`     |
| `gemini/`      | Gemini CLI     | `GEMINI.md`, `.gemini/`, `.geminiignore`              |
| `opencode/`    | OpenCode       | `opencode.md`, `.opencode.json`, `.opencode/`         |

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

`multi/` — A project-level setup targeting **Claude Code + Cursor** simultaneously. This directory **includes a `coati.json`** as a reference manifest.

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

`user/` — A global setup that installs to home directories (`~/`), targeting **Claude Code + Gemini + Codex**. This directory **includes a `coati.json`** with `placement: "global"` on every file.

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
