# Cursor IDE Playground

This is a test environment for the **Coati CLI** that simulates a real TypeScript project with a full Cursor IDE setup. It contains realistic configuration files covering every Cursor feature surface.

## Config Files Present

| File                                   | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `package.json`                         | Node.js/TypeScript project manifest                                |
| `.cursorrules`                         | **Legacy** root-level rules file (predates MDC format)             |
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
| `.cursorindexingignore`                | Excludes large generated files from codebase indexing              |

## MDC Rule Format

Cursor's `.mdc` (Markdown Configuration) files use YAML frontmatter to control when rules are applied:

```
---
description: Human-readable description of the rule
alwaysApply: true          # Apply to every conversation
globs: ["src/**/*.ts"]     # Or apply only when matching files are referenced
---

# Rule content in Markdown
```

- `alwaysApply: true` rules are included in every AI interaction
- `globs` rules activate only when the user is working with matching files
- The legacy `.cursorrules` file at the project root applies globally but lacks the scoping features of MDC

## Example Coati CLI Usage

```bash
# Clone this setup from Coati
coati clone @jim/cursor-typescript-setup

# Initialize a new setup from this directory
coati init

# Publish this setup to Coati
coati publish

# View a setup's details
coati view @jim/cursor-typescript-setup

# Search for Cursor setups
coati search "cursor typescript"
```

## Purpose

This playground exists to test how the Coati CLI handles:

- Detecting and cataloging Cursor config files
- Parsing MDC frontmatter (YAML + Markdown body)
- Handling the legacy `.cursorrules` format alongside modern `.cursor/rules/` MDC files
- Packaging MCP server configs, hooks, commands, and skills
- Generating `setup.json` manifests from existing project files
- Resolving file conflicts during `coati clone`
