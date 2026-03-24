# Codex CLI Playground

This directory simulates a real TypeScript project that uses the **OpenAI Codex CLI** as its AI coding tool. It serves as a test environment for the Magpie CLI's `init`, `clone`, and `publish` commands.

## What's Here

| File / Directory | Purpose |
|---|---|
| `package.json` | Standard Node.js/TypeScript project manifest with build, dev, test, and lint scripts |
| `AGENTS.md` | Project-level instructions for Codex (equivalent to Claude's `CLAUDE.md`) — coding conventions, architecture, testing patterns, do's and don'ts |
| `.codex/config.toml` | Codex project configuration — model selection, sandbox settings, MCP server definitions |
| `.codex/agents/reviewer.toml` | Custom subagent specialized in code review |
| `.codex/agents/test-writer.toml` | Custom subagent specialized in writing test suites |
| `.agents/skills/api-patterns/SKILL.md` | Skill file teaching Codex how to write API route handlers following project conventions |
| `.agents/skills/testing/SKILL.md` | Skill file teaching Codex the project's testing patterns and rules |

## How Codex Uses These Files

- **AGENTS.md** is automatically loaded as context for every Codex session, similar to how Claude reads `CLAUDE.md`.
- **`.codex/config.toml`** configures the model, sandbox environment, and MCP servers that Codex connects to.
- **Subagents** in `.codex/agents/` are invoked with `codex --agent <name>` for specialized tasks.
- **Skills** in `.agents/skills/` provide reusable knowledge that Codex can reference when performing specific types of work.

## Testing With Magpie

This playground is used to verify that the Magpie CLI correctly:

1. Detects Codex config files during `magpie init`
2. Writes all config files to the correct paths during `magpie clone`
3. Packages and uploads config files during `magpie publish`
4. Handles dotfile directories (`.codex/`, `.agents/`) without issues
