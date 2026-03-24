# Claude Code Playground

This directory simulates a real TypeScript project with a full Claude Code setup.
It is a **test environment for the Magpie CLI** — use it to verify that Magpie
correctly discovers, parses, and packages Claude Code configuration files.

## What's Here

| File / Directory                       | Purpose                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `package.json`                         | Project manifest for a TypeScript/Express app               |
| `CLAUDE.md`                            | Project instructions that Claude Code reads for context     |
| `.claude/settings.json`                | Project-level permissions and model preferences             |
| `.claude/commands/review.md`           | Custom `/review` slash command for code review              |
| `.claude/commands/test-coverage.md`    | Custom `/test-coverage` slash command for coverage analysis |
| `.claude/skills/api-patterns/SKILL.md` | Skill teaching Claude the project's API conventions         |
| `.claude/hooks/pre-commit.sh`          | Pre-commit hook running lint, type-check, and tests         |
| `.mcp.json`                            | MCP server configuration (filesystem, fetch, sqlite)        |

## Usage with Magpie CLI

From this directory, you can test Magpie commands like:

```bash
# Initialize a Magpie setup from this project's config
magpie init

# Verify the generated setup.json includes all detected files
cat setup.json
```

## Not Included

- `setup.json` — intentionally omitted so you can test `magpie init` generating it
- `node_modules/` — this is a simulated project, no need to install dependencies
- `src/` — source code is not needed; the playground focuses on config files only
