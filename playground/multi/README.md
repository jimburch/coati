# Multi-Agent Playground

This directory demonstrates a **multi-agent setup** — the same Express + TypeScript + SQLite project configured for both **Claude Code** and **Cursor** side by side.

It is a test environment for the Magpie CLI and platform, showing how a single `setup.json` can bundle config files for multiple AI coding agents, with per-file `agent` fields identifying which tool each file belongs to.

## Config Files

### Shared (no `agent` field — installed for all users)

| File           | Purpose                             |
| -------------- | ----------------------------------- |
| `package.json` | Node.js/TypeScript project manifest |
| `README.md`    | This file                           |

### Claude Code (`agent: "claude-code"`)

| File                                   | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `CLAUDE.md`                            | Project instructions that Claude Code reads for context     |
| `.claude/settings.json`                | Project-level permissions and model preferences             |
| `.claude/commands/review.md`           | Custom `/review` slash command for code review              |
| `.claude/commands/test-coverage.md`    | Custom `/test-coverage` slash command for coverage analysis |
| `.claude/hooks/pre-commit.sh`          | Pre-commit hook running lint, type-check, and tests         |
| `.claude/skills/api-patterns/SKILL.md` | Skill teaching Claude the project's API conventions         |
| `.mcp.json`                            | MCP server configuration (filesystem, fetch, sqlite)        |

### Cursor (`agent: "cursor"`)

| File                                   | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `.cursorrules`                         | Legacy root-level rules file (predates MDC format)                 |
| `.cursor/rules/typescript.mdc`         | MDC rule: TypeScript conventions (`alwaysApply: true`)             |
| `.cursor/rules/api-patterns.mdc`       | MDC rule: Express API patterns (glob-scoped to routes/controllers) |
| `.cursor/rules/testing.mdc`            | MDC rule: Vitest testing conventions (glob-scoped to test files)   |
| `.cursor/mcp.json`                     | MCP server configuration (filesystem + fetch servers)              |
| `.cursor/hooks.json`                   | Agent lifecycle hooks (eslint auto-fix, shell logging)             |
| `.cursor/commands/review.md`           | Custom slash command: code review checklist                        |
| `.cursor/commands/test-coverage.md`    | Custom slash command: test coverage analysis                       |
| `.cursor/commands/refactor.md`         | Custom slash command: guided refactoring                           |
| `.cursor/skills/api-patterns/SKILL.md` | Skill: API endpoint writing instructions                           |
| `.cursorignore`                        | Excludes sensitive files from AI access                            |
| `.cursorindexingignore`                | Excludes large generated files from Cursor's codebase index        |

## How the `agent` Field Works

In `setup.json`, each file entry has an optional `agent` field:

```json
{
	"source": ".claude/settings.json",
	"target": ".claude/settings.json",
	"placement": "project",
	"componentType": "instruction",
	"agent": "claude-code"
}
```

- **With `agent`**: installed only when the user has that agent, or when explicitly requested
- **Without `agent`**: shared file, always installed regardless of which agents the user has

## Usage with Magpie CLI

```bash
# Clone this multi-agent setup
magpie clone @jim/typescript-express-multi-agent

# Initialize a new setup from an existing multi-agent project
magpie init

# Publish a multi-agent setup
magpie publish
```

## Not Included

- `setup.json` is present here (unlike the single-agent playgrounds) to demonstrate the manifest format
- `node_modules/` — simulated project, no dependencies installed
- `src/` — source code omitted; the playground focuses on config files only
