# Atlas UI — Cursor Setup

Atlas UI is a React + Tailwind component library shipping 60+ primitives,
composites, and patterns used across the Atlas product suite. This repository
ships a complete Cursor configuration with scoped rules, slash commands,
skills, hooks, and MCP servers.

## What's in `.cursor/`

| Path | Purpose |
| --- | --- |
| `rules/project.mdc` | Repo-wide rules (`alwaysApply: true`) |
| `rules/typescript.mdc` | TS conventions (`alwaysApply: true`) |
| `rules/react-components.mdc` | Component conventions scoped to `src/components/**/*.tsx` |
| `rules/storybook.mdc` | Story conventions scoped to `**/*.stories.tsx` |
| `rules/testing.mdc` | Test conventions scoped to `**/*.test.tsx` |
| `rules/tailwind.mdc` | Tailwind + `cva` conventions |
| `rules/accessibility.mdc` | A11y rules for interactive components |
| `commands/new-component.md` | Scaffold a new component + story + test |
| `commands/refactor.md` | Extract a subcomponent from a large file |
| `commands/review.md` | Review staged changes against Atlas conventions |
| `commands/test-coverage.md` | Identify test gaps |
| `commands/a11y-audit.md` | Run axe against the Storybook dev server |
| `skills/component-patterns/SKILL.md` | How to build a shadcn-style primitive |
| `skills/storybook-stories/SKILL.md` | Story-writing patterns |
| `skills/vitest-react/SKILL.md` | RTL + Vitest patterns |
| `skills/accessibility/SKILL.md` | ARIA patterns and keyboard handling |
| `hooks.json` | Auto-format on save, log shell commands |
| `mcp.json` | Filesystem, Chromatic, Figma, fetch |

## Scoped `.mdc` rules

Cursor loads `.mdc` rules based on which files are in context:

- `alwaysApply: true` — always included (project + typescript)
- `alwaysApply: false` with `globs` — loaded only when matching files are open

This keeps the context budget tight and avoids irrelevant rules polluting
simple edits.

## Legacy `.cursorrules`

The root `.cursorrules` file is kept as a fallback for older Cursor versions
that don't parse `.mdc`. Newer versions ignore it and read the scoped rules.

## Getting started

```bash
pnpm install
pnpm storybook       # http://localhost:6006
pnpm test            # vitest in watch mode
pnpm test:a11y       # axe run against built Storybook
```
