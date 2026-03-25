# Gemini CLI Playground

This directory simulates a real TypeScript project with a complete Gemini CLI
configuration. It serves as a test environment for the Coati CLI's `clone` and
`init` commands to verify correct handling of Gemini CLI setups.

## What's Inside

### Project Files

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `package.json`  | Standard Node.js/TypeScript project manifest                  |
| `GEMINI.md`     | Project instructions for Gemini CLI (equivalent to CLAUDE.md) |
| `.geminiignore` | Tells Gemini CLI which files/directories to skip              |

### Gemini Configuration (`.gemini/`)

| File                                   | Purpose                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `.gemini/settings.json`                | Project-level settings: MCP servers, tool permissions, context window config          |
| `.gemini/commands/review.toml`         | Custom `/review` slash command for code review                                        |
| `.gemini/commands/test-coverage.toml`  | Custom `/test-coverage` slash command for coverage analysis                           |
| `.gemini/commands/deploy-check.toml`   | Custom `/deploy-check` slash command for deployment readiness                         |
| `.gemini/skills/api-patterns/SKILL.md` | Skill teaching Gemini the project's API route patterns                                |
| `.gemini/skills/testing/SKILL.md`      | Skill teaching Gemini the project's testing conventions                               |
| `.gemini/policies/shell.toml`          | Policy controlling which shell commands are allowed, need confirmation, or are denied |

## How Coati Uses This

When a user publishes a Gemini CLI setup to Coati, the platform packages these
configuration files into a shareable, installable unit. Another user can then
`coati clone` that setup to bootstrap their own project with the same Gemini CLI
configuration.

This playground lets us test that:

1. All Gemini-specific files are detected and categorized correctly
2. The `init` command maps Gemini config files to the right setup.json fields
3. The `clone` command writes files to the correct paths with proper content
4. Conflict resolution works when cloning into an existing project
