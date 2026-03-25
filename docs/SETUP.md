# Setup Specification

## 1. Overview

A **setup** is a publishable, installable package of AI coding tool configuration. It bundles everything needed to reproduce a specific workflow — instructions, commands, skills, tool integrations, and hooks — into a single unit that can be shared, discovered, and cloned.

Think of it like a GitHub repo, but for your AI assistant's brain.

For the MVP, Coati targets **Claude Code** exclusively. The data model is designed so that additional tools (Cursor, Codex, Windsurf, etc.) can be added without structural changes.

## 2. Setup Components (Claude Code)

Every setup contains one or more **components**. Each component maps to a specific Claude Code configuration mechanism.

Only **Instructions** are required. All other component types are optional.

### 2.1 Instructions

Project instructions that shape Claude's behavior. These are `CLAUDE.md` files — markdown documents that Claude reads automatically at the start of every conversation.

| Property     | Value                                       |
| ------------ | ------------------------------------------- |
| Required     | Yes (at least one)                          |
| Source files | `CLAUDE.md`, `path/to/CLAUDE.md`            |
| Placement    | Root of project or scoped to subdirectories |

Claude Code supports directory-scoped instructions. A `CLAUDE.md` at the project root applies globally; one inside `src/lib/` applies only when Claude works in that directory. Setups can include both.

**Example:**

```markdown
# CLAUDE.md

## Coding Conventions

- Use TypeScript strict mode
- Prefer const over let; never use var
- All API routes return { data: T } on success, { error: string } on failure
```

### 2.2 Slash Commands

Reusable prompt templates that users invoke via `/<command-name>` in Claude Code. Stored as markdown files in `.claude/commands/`.

| Property     | Value                         |
| ------------ | ----------------------------- |
| Required     | No                            |
| Source files | `.claude/commands/<name>.md`  |
| Invocation   | `/<name>` or `/<name> <args>` |

Commands support the `$ARGUMENTS` placeholder, which is replaced with whatever the user types after the command name.

**Example:** `.claude/commands/review-pr.md`

```markdown
Review pull request #$ARGUMENTS. Check for:

- Security vulnerabilities
- Performance regressions
- Missing test coverage
- Breaking API changes

Summarize findings as a numbered list.
```

### 2.3 Skills

Richer than commands — skills are markdown files with YAML frontmatter that define name, description, and trigger conditions. Stored in `.claude/skills/`.

| Property     | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Required     | No                                                           |
| Source files | `.claude/skills/<name>.md`                                   |
| Activation   | Manual via Skill tool, or auto-triggered by context matching |

Skills can be invoked explicitly or triggered automatically when Claude detects a matching context based on the frontmatter.

**Example:** `.claude/skills/tdd.md`

```markdown
---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

## TDD Workflow

1. Write a failing test that captures the requirement
2. Run the test to confirm it fails
3. Write the minimum code to make it pass
4. Refactor while keeping tests green
5. Repeat
```

### 2.4 MCP Server Configs

JSON definitions of external tool integrations (Model Context Protocol servers). These extend Claude's capabilities with custom tools — database access, API clients, code analysis, etc.

| Property       | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Required       | No                                                      |
| Source files   | Entries within `.claude/settings.json` → `mcpServers`   |
| Clone behavior | Merged into the user's existing `.claude/settings.json` |

Each MCP server config specifies a command to run, arguments, and optional environment variables.

**Example:**

```json
{
	"serena": {
		"command": "uvx",
		"args": ["serena", "--project-root", "."],
		"env": {}
	}
}
```

### 2.5 Hooks

Event-driven shell commands that fire on Claude Code lifecycle events. These automate pre/post actions like linting, formatting, or custom validation.

| Property       | Value                                                   |
| -------------- | ------------------------------------------------------- |
| Required       | No                                                      |
| Source files   | Entries within `.claude/settings.json` → `hooks`        |
| Clone behavior | Merged into the user's existing `.claude/settings.json` |

Supported hook events: `PreToolUse`, `PostToolUse`, `Notification`, `Stop`.

**Example:**

```json
{
	"PreToolUse": [
		{
			"matcher": "Write|Edit",
			"hooks": [
				{
					"type": "command",
					"command": "echo 'Remember: run prettier after editing files'"
				}
			]
		}
	]
}
```

## 3. The Manifest (`setup.json`)

Every setup has a `setup.json` manifest at its root. This file describes the setup's metadata and declares its components.

### 3.1 Schema

```jsonc
{
	// ── Required ──────────────────────────────────────────────
	"name": "string", // Human-readable name (max 100 chars)
	"description": "string", // Short description (max 300 chars)
	"version": "string", // Semver (e.g. "1.0.0")
	"tool": "string", // Target tool identifier (e.g. "claude-code")

	// ── Optional ──────────────────────────────────────────────
	"category": "string", // One of the predefined categories
	"tags": ["string"], // Freeform tags for discovery (max 10)
	"readme": "string", // Path to a README file within the setup
	"license": "string", // SPDX license identifier (e.g. "MIT")
	"minToolVersion": "string", // Minimum Claude Code version required
	"prerequisites": ["string"], // Human-readable prerequisites
	"postInstall": "string", // Message displayed after clone
	"screenshots": ["string"], // Paths to screenshot images

	// ── Components ────────────────────────────────────────────
	"components": {
		"instructions": [
			{
				"source": "string", // Path to file within the setup
				"target": "string", // Where to place it on clone
				"placement": "string", // "global" | "project" | "relative"
				"description": "string" // What this file does
			}
		],
		"commands": [
			{
				"source": "string",
				"target": "string",
				"placement": "string",
				"description": "string"
			}
		],
		"skills": [
			{
				"source": "string",
				"target": "string",
				"placement": "string",
				"description": "string"
			}
		],
		"mcpServers": [
			{
				"name": "string", // Server identifier key
				"config": {}, // Full MCP server config object
				"description": "string"
			}
		],
		"hooks": [
			{
				"event": "string", // Hook event (e.g. "PreToolUse")
				"config": {}, // Full hook config object
				"description": "string"
			}
		]
	}
}
```

### 3.2 Complete Example

```json
{
	"name": "SvelteKit Fullstack",
	"description": "Claude Code setup for SvelteKit apps with Drizzle ORM, Tailwind, and TDD workflow",
	"version": "1.2.0",
	"tool": "claude-code",
	"category": "web-dev",
	"tags": ["sveltekit", "drizzle", "tailwind", "tdd"],
	"readme": "README.md",
	"license": "MIT",
	"minToolVersion": "1.0.0",
	"prerequisites": ["Node.js 20+", "PostgreSQL 15+"],
	"postInstall": "Run 'pnpm install' and copy .env.example to .env before starting.",
	"screenshots": [],
	"components": {
		"instructions": [
			{
				"source": "CLAUDE.md",
				"target": "CLAUDE.md",
				"placement": "project",
				"description": "Root project instructions with coding conventions and architecture overview"
			},
			{
				"source": "src/lib/CLAUDE.md",
				"target": "src/lib/CLAUDE.md",
				"placement": "relative",
				"description": "Library-specific instructions for shared utilities and components"
			}
		],
		"commands": [
			{
				"source": "commands/review-pr.md",
				"target": ".claude/commands/review-pr.md",
				"placement": "project",
				"description": "Review a pull request for security, performance, and test coverage"
			},
			{
				"source": "commands/db-migrate.md",
				"target": ".claude/commands/db-migrate.md",
				"placement": "project",
				"description": "Generate and run a Drizzle database migration"
			}
		],
		"skills": [
			{
				"source": "skills/tdd.md",
				"target": ".claude/skills/tdd.md",
				"placement": "project",
				"description": "Test-driven development workflow"
			}
		],
		"mcpServers": [
			{
				"name": "serena",
				"config": {
					"command": "uvx",
					"args": ["serena", "--project-root", "."],
					"env": {}
				},
				"description": "Semantic code analysis and navigation"
			}
		],
		"hooks": [
			{
				"event": "PreToolUse",
				"config": {
					"matcher": "Bash",
					"hooks": [
						{
							"type": "command",
							"command": "echo 'Reminder: prefer dedicated tools over shell commands'"
						}
					]
				},
				"description": "Remind Claude to prefer dedicated tools over Bash"
			}
		]
	}
}
```

## 4. Metadata Fields

### name

Human-readable display name. Max 100 characters. Does not need to be unique globally — uniqueness is enforced by the `owner/slug` pair.

### slug

URL-safe identifier derived from the name. Lowercase, hyphens only, max 100 characters. Auto-generated from `name` on publish if not provided. Must be unique per user.

### description

Short summary shown in search results and setup cards. Max 300 characters. Plain text, no markdown.

### version

Semantic version string following [semver](https://semver.org/). Starts at `0.1.0` for new setups. Bumped on each publish update.

### tool

Identifier for the target AI coding tool. MVP value: `"claude-code"`. Future values: `"cursor"`, `"codex"`, `"windsurf"`, etc. Maps to the `tools` table via the `setup_tools` join table.

### category

Primary classification for browse/filter. One of:

| Value          | Description                                      |
| -------------- | ------------------------------------------------ |
| `web-dev`      | Frontend, backend, and fullstack web development |
| `mobile`       | iOS, Android, React Native, Flutter              |
| `data-science` | ML, data pipelines, notebooks, analytics         |
| `devops`       | CI/CD, infrastructure, deployment, monitoring    |
| `systems`      | Low-level, embedded, OS, networking              |
| `general`      | Cross-cutting or not domain-specific             |

### tags

Freeform strings for fine-grained discovery. Max 10 tags per setup, max 50 characters each. Lowercased and trimmed on save. Maps to the `tags` / `setup_tags` tables.

### readme

Relative path to a README file within the setup. Rendered on the setup's detail page. Supports markdown with syntax-highlighted code blocks.

### license

SPDX license identifier (e.g. `"MIT"`, `"Apache-2.0"`). Optional — defaults to no license (all rights reserved).

### minToolVersion

Minimum required version of the target tool. The CLI warns (but does not block) if the user's installed version is below this.

### prerequisites

Array of human-readable strings describing what the user needs before cloning. Displayed before clone confirmation and in the post-install output.

### postInstall

A message displayed after a successful clone. Use it for next-step instructions like running install commands or configuring environment variables.

### screenshots

Array of paths to image files within the setup. Displayed on the setup detail page as a gallery.

## 5. Creation Flow

### CLI: `coati init`

1. **Auto-detection** — Scans the current directory for Claude Code configuration files:
   - `CLAUDE.md` (root and subdirectories)
   - `.claude/commands/*.md`
   - `.claude/skills/*.md`
   - `.claude/settings.json` (extracts `mcpServers` and `hooks`)

2. **Interactive prompts** — Asks for metadata not derivable from files:
   - Name (default: directory name)
   - Description
   - Category (select from enum)
   - Tags (comma-separated)
   - License (default: MIT)

3. **Generates `setup.json`** — Writes the manifest with detected components and user-provided metadata. Each detected file becomes a component entry with sensible defaults for `target` and `placement`.

4. **Review** — Prints a summary of what was detected and lets the user confirm or edit before writing.

### CLI: `coati publish`

1. Reads `setup.json` from the current directory
2. Validates the manifest (required fields, valid JSON, files exist)
3. Authenticates via stored token (or prompts `coati login`)
4. Uploads manifest + all referenced files to the Coati API
5. Creates or updates the setup on the platform
6. Returns the URL: `https://coati.dev/<username>/<slug>`

### Web UI

After publishing, users can edit metadata (description, tags, category, readme) via the web interface. File contents can be viewed but not edited on the web for MVP — edits require re-publishing from the CLI.

## 6. Clone/Install Flow

### CLI: `coati clone <owner>/<setup-name>`

#### Step 1: Fetch

Downloads the setup manifest and all component files from the API.

#### Step 2: Backup

Before writing any files, backs up existing configuration to `.coati/backups/<timestamp>/`:

```
.coati/backups/
  2025-03-15T14-30-00/
    CLAUDE.md
    .claude/
      commands/
      skills/
      settings.json
```

Only files that would be overwritten or modified are backed up.

#### Step 3: Write Components

Each component type has specific merge behavior:

**Instructions** (`CLAUDE.md` files):

- If no existing file at target path → write directly
- If file exists → prompt: overwrite / append / skip
- Append mode adds a separator comment and the new content below

**Slash Commands** (`.claude/commands/*.md`):

- If no existing file at target path → write directly
- If file exists with same name → prompt: overwrite / skip
- Commands never merge — they're atomic units

**Skills** (`.claude/skills/*.md`):

- Same behavior as commands — write or skip, no merge

**MCP Server Configs:**

- Reads existing `.claude/settings.json` (or creates it)
- For each server in the setup:
  - If server name doesn't exist → add it
  - If server name exists with identical config → skip
  - If server name exists with different config → prompt: overwrite / skip
- Writes updated `settings.json`

**Hooks:**

- Reads existing `.claude/settings.json`
- For each hook event in the setup:
  - If event doesn't exist → add it
  - If event exists → append new hook entries (hooks are additive by design)
  - Duplicate detection: skips if an identical hook entry already exists under the same event
- Writes updated `settings.json`

#### Step 4: Post-Install

- Displays the `postInstall` message if present
- Lists all files written/modified
- Shows backup location
- Prints any `prerequisites` that were declared

### Flags

| Flag        | Behavior                                                   |
| ----------- | ---------------------------------------------------------- |
| `--dry-run` | Show what would be written/modified without making changes |
| `--force`   | Skip all prompts, overwrite everything                     |
| `--pick`    | Interactive picker to select which components to install   |

## 7. Backup & Revert

### Auto-Backup

Every `coati clone` automatically creates a timestamped backup before modifying files. Backups are stored locally in `.coati/backups/` and are never uploaded to the platform.

```
.coati/backups/
  2025-03-15T14-30-00/
    manifest.json          # Records what setup was cloned and what was backed up
    files/
      CLAUDE.md
      .claude/settings.json
```

The `manifest.json` records:

- Setup that was cloned (`owner/slug@version`)
- Timestamp
- List of files that were backed up with their original paths

### Revert

```bash
# Restore the most recent backup
coati revert

# List all available backups
coati revert --list

# Restore a specific backup by timestamp
coati revert 2025-03-15T14-30-00
```

Revert restores all backed-up files to their original locations, effectively undoing the most recent clone operation.

## 8. Database Mapping

The `setup.json` manifest maps to the existing database schema as follows:

| Manifest Field  | Database Location                                       |
| --------------- | ------------------------------------------------------- |
| `name`          | `setups.name`                                           |
| `slug`          | `setups.slug` (derived from name)                       |
| `description`   | `setups.description`                                    |
| `version`       | `setups.version`                                        |
| `readme`        | `setups.readmePath` (points to a file in `setup_files`) |
| `tool`          | `setup_tools` join → `tools.slug`                       |
| `tags`          | `setup_tags` join → `tags.name`                         |
| Component files | `setup_files` (one row per file)                        |

### Schema Changes Needed

The current schema handles most of the manifest, but the following additions are needed:

1. **`component_type` on `setup_files`** — A new enum column to distinguish between `instruction`, `command`, `skill`, `mcp_server`, and `hook`. Currently, files only have `source`, `target`, and `placement`; the component type is implicit. Making it explicit enables filtered queries (e.g. "show me just the commands in this setup").

2. **`category` on `setups`** — A new enum column for the setup's primary category. Currently there's no category field.

3. **`license` on `setups`** — A `varchar` column for the SPDX license identifier.

4. **`min_tool_version` on `setups`** — A `varchar` column for the minimum tool version.

5. **`post_install` on `setups`** — A `text` column for the post-install message.

6. **`prerequisites` on `setups`** — A `text[]` array column or a separate `setup_prerequisites` table.

These are additive changes (new columns/enums) and won't break existing data.

## 9. Future Tool Support

The setup model extends to other AI coding tools by defining tool-specific component types and clone behaviors.

### Cursor

- **Instructions:** `.cursorrules` (root-level rules file)
- **Settings:** `.cursor/settings.json`
- Component types: `instruction`, `setting`

### Codex (OpenAI)

- **Instructions:** `codex.md`, `AGENTS.md`
- **Settings:** `codex.json`
- Component types: `instruction`, `agent`

### Windsurf

- **Instructions:** `.windsurfrules`
- **Settings:** `.windsurf/settings.json`
- Component types: `instruction`, `setting`

### How It Works

Each tool registers its own:

- **Component type definitions** — what config files it uses and where they live
- **Detection rules** — how `coati init` finds existing config for that tool
- **Clone behavior** — per-component-type merge/write strategy

The `tool` field in `setup.json` determines which set of rules apply. A single setup targets one tool. Users who want to share configs for multiple tools publish separate setups.

The `tools` table in the database already supports this — each tool is a row with a `name` and `slug`. The `setup_tools` join table links setups to their target tools. For MVP, only a `claude-code` row exists.
