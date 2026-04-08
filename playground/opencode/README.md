# OpenCode Playground

This directory is a test environment for the **Coati CLI**. It simulates a
realistic TypeScript project that uses [OpenCode](https://opencode.ai) as its
AI coding assistant, providing a complete set of configuration files for Coati
to detect, parse, and clone.

## What's inside

| File                                  | Purpose                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `package.json`                        | Standard Node.js/TypeScript project manifest                                           |
| `opencode.md`                         | Project instructions for OpenCode (coding conventions, architecture, testing patterns) |
| `.opencode.json`                      | OpenCode project configuration (provider, MCP servers, context paths, shell allowlist) |
| `.opencode/commands/review.md`        | Custom slash command: code review (`project:review`)                                   |
| `.opencode/commands/test-coverage.md` | Custom slash command: test coverage analysis (`project:test-coverage`)                 |
| `.opencode/commands/deploy-check.md`  | Custom slash command: deployment readiness check (`project:deploy-check`)              |

## How Coati uses this

When running `coati init` in this directory, the CLI should detect the OpenCode
configuration files and offer to create a `coati.json` manifest from them. This
playground lets you test that detection and initialization flow against realistic
file contents rather than minimal stubs.

The directory intentionally does **not** include a `coati.json` so you can test
the full init flow from scratch.

## OpenCode config structure

OpenCode uses a flat project-level config:

- **`opencode.md`** at the project root contains human-readable instructions
  (equivalent to Claude Code's `CLAUDE.md`)
- **`.opencode.json`** at the project root contains machine-readable config
  (provider settings, MCP servers, context paths, shell allowlists)
- **`.opencode/commands/*.md`** contains custom slash commands scoped to the
  project, each with YAML frontmatter for metadata and Markdown body for the
  prompt template
