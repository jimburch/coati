# CLI Specification — `coati`

## Overview

`coati` is a Node.js CLI tool published to npm. It lets developers search, clone, publish, and interact with Coati from their terminal. It's the primary way setups get installed onto local machines.

## Installation

```bash
npm install -g coati
```

## Command Reference

### `coati login`

Authenticate with Coati using GitHub Device Flow.

```
$ coati login
→ Opening GitHub authorization page...
→ Enter this code: ABCD-1234
→ Waiting for authorization... ✓
→ Logged in as alice (alice@github)
→ Token saved to ~/.coati/config.json
```

**Flow:**

1. CLI sends `POST /api/v1/auth/device` to get a device code + verification URL
2. Opens browser to GitHub verification URL (or prints it if browser can't open)
3. Polls `POST /api/v1/auth/device/poll` until authorized
4. Receives platform token, stores at `~/.coati/config.json`

### `coati logout`

Remove stored credentials.

```
$ coati logout
→ Logged out. Token removed from ~/.coati/config.json
```

### `coati search <query>`

Search for setups by keyword. Supports tool and tag filters.

```
$ coati search "claude mcp typescript"

  1. alice/mcp-power-setup        ★ 142  ↓ 89
     Claude Code + 8 MCP servers for TypeScript fullstack
     Tools: claude-code  Tags: typescript, mcp, fullstack

  2. bob/minimal-claude            ★ 98   ↓ 203
     Minimalist Claude Code setup — opinionated and clean
     Tools: claude-code  Tags: minimal, clean

  3. carol/cursor-claude-hybrid    ★ 67   ↓ 45
     Cursor + Claude Code working together
     Tools: claude-code, cursor  Tags: typescript, hybrid
```

**Options:**

- `--tool <n>` — filter by tool (e.g. `--tool claude-code`)
- `--tag <n>` — filter by tag (e.g. `--tag typescript`)
- `--sort <field>` — sort by `stars`, `clones`, `recent` (default: relevance)
- `--limit <n>` — results to show (default: 10)

### `coati trending`

Show trending setups.

```
$ coati trending

  Trending setups this week:

  1. alice/mcp-power-setup        ★ 142  ↓ 89   🔥 +34 stars this week
  2. dave/opencode-local-first     ★ 56   ↓ 112  🔥 +28 stars this week
  ...
```

### `coati view <owner>/<slug>`

View details of a specific setup.

```
$ coati view alice/mcp-power-setup

  alice/mcp-power-setup  v1.2.0
  ★ 142 stars  ↓ 89 clones

  Claude Code + 8 MCP servers for TypeScript fullstack

  Tools: claude-code
  Tags: typescript, mcp, fullstack, nextjs

  Files (6):
    .claude/settings.json      → ~/.claude/settings.json
    .claude/mcp.json           → ~/.claude/mcp.json
    CLAUDE.md                  → ./CLAUDE.md (project)
    scripts/statusline.sh      → ~/.claude/statusline.sh
    hooks/pre-commit.sh        → .claude/hooks/pre-commit.sh
    skills/deep-research.md    → ~/.claude/skills/deep-research.md

  View on web: https://coati.sh/alice/mcp-power-setup
```

### `coati clone <owner>/<slug>`

Clone and install a setup to local machine. This is the flagship command.

```
$ coati clone alice/mcp-power-setup

  🐦‍⬛ Cloning alice/mcp-power-setup v1.2.0...

  This setup will write 6 files:

    1. ~/.claude/settings.json       (global)
    2. ~/.claude/mcp.json            (global)
    3. ./CLAUDE.md                   (project — current directory)
    4. ~/.claude/statusline.sh       (global)
    5. .claude/hooks/pre-commit.sh   (project)
    6. ~/.claude/skills/deep-research.md (global)

  ⚠ Conflict: ~/.claude/settings.json already exists

  ? How do you want to handle this?
    ❯ Overwrite
      Skip
      Backup existing (→ settings.json.bak)
      Show diff

  ✓ Wrote 5 files, skipped 1
  ✓ Running post-install: chmod +x ~/.claude/statusline.sh

  Done! Setup installed successfully.
```

**Options:**

- `--dry-run` — preview what would be written without writing anything
- `--force` — overwrite all conflicts without prompting
- `--pick` — interactive file picker (checkboxes to select which files to install)
- `--no-post-install` — skip post-install commands
- `--project-dir <path>` — set the project directory for project-scoped files (default: cwd)

**Clone Flow (detailed):**

1. Fetch setup metadata from `GET /api/v1/setups/:owner/:slug`
2. Fetch files from `GET /api/v1/setups/:id/files`
3. Resolve target paths:
   - `~` expanded to `os.homedir()`
   - `./` expanded to `--project-dir` or `process.cwd()`
4. Check each target path for existing files
5. For each conflict, prompt user (unless `--force` or `--dry-run`)
6. Write files with `fs.writeFile`, creating parent directories with `fs.mkdir({ recursive: true })`
7. Execute `postInstall` commands sequentially (with user confirmation)
8. Send `POST /api/v1/setups/:id/clone` to record the clone event
9. Print summary

### `coati init`

Scaffold a `coati.json` manifest in the current directory.

```
$ coati init

  🐦‍⬛ Initializing new Coati setup...

  ? Setup name: my-awesome-workflow
  ? Description: My Claude Code + Cursor setup for React dev
  ? Tools (comma-separated): claude-code, cursor
  ? Tags (comma-separated): react, typescript, mcp

  Scanning for common config files...
    Found: .claude/settings.json
    Found: CLAUDE.md
    Found: .claude/mcp.json

  ? Include .claude/settings.json? (Y/n) Y
  ? Target path for .claude/settings.json: (~/.claude/settings.json)
  ? Placement: (global/project) global

  ... (repeat for each found file)

  ✓ Created coati.json

  Next steps:
    1. Edit coati.json to refine file mappings
    2. Add a README.md describing your workflow
    3. Run `coati publish` to share it
```

**Auto-detection:** The CLI scans common paths for AI config files:

- `.claude/settings.json`, `.claude/mcp.json`, `CLAUDE.md`
- `.cursor/rules`, `.cursorrules`
- `AGENTS.md`, `.github/copilot-instructions.md`
- `.claude/hooks/`, `.claude/skills/`, `.claude/commands/`

### `coati publish`

Publish or update a setup from the current directory.

```
$ coati publish

  Reading coati.json...
  Validating manifest... ✓
  Collecting 6 files (12.4 KB total)...

  Publishing alice/my-awesome-workflow v1.0.0...
  ✓ Published! View at: https://coati.sh/alice/my-awesome-workflow
```

**For updates:**

```
$ coati publish --update

  Updating alice/my-awesome-workflow to v1.1.0...
  Changed files: 2 modified, 1 added
  ✓ Updated! View at: https://coati.sh/alice/my-awesome-workflow
```

### `coati star <owner>/<slug>`

Star a setup.

```
$ coati star alice/mcp-power-setup
→ ★ Starred alice/mcp-power-setup
```

### `coati unstar <owner>/<slug>`

Remove a star.

### `coati follow <username>`

Follow a user.

```
$ coati follow alice
→ ✓ Following alice
```

### `coati unfollow <username>`

Unfollow a user.

## The `coati.json` Manifest Specification

Every setup has a `coati.json` at its root. This is the platform's core standard.

```json
{
	"$schema": "https://coati.sh/schema/setup.v1.json",
	"name": "my-fullstack-workflow",
	"version": "1.2.0",
	"description": "My Claude Code + Cursor setup for TypeScript fullstack dev",
	"tools": ["claude-code", "cursor"],
	"tags": ["typescript", "nextjs", "mcp", "fullstack"],
	"files": [
		{
			"source": "claude/settings.json",
			"target": "~/.claude/settings.json",
			"placement": "global",
			"description": "Global Claude Code settings with broad permissions"
		},
		{
			"source": "claude/CLAUDE.md",
			"target": "./CLAUDE.md",
			"placement": "project",
			"description": "Project-level instructions — drop in any repo root"
		},
		{
			"source": "mcp/mcp.json",
			"target": "~/.claude/mcp.json",
			"placement": "global",
			"description": "MCP server configs (GitHub, Postgres, filesystem)"
		},
		{
			"source": "scripts/statusline.sh",
			"target": "~/.claude/statusline.sh",
			"placement": "global",
			"description": "Custom statusline showing repo name + context usage"
		}
	],
	"postInstall": ["chmod +x ~/.claude/statusline.sh"],
	"readme": "README.md"
}
```

### Manifest Fields

| Field         | Required | Type        | Description                                    |
| ------------- | -------- | ----------- | ---------------------------------------------- |
| `name`        | Yes      | string      | URL-safe slug (lowercase, hyphens, 3-50 chars) |
| `version`     | Yes      | string      | Semver (e.g. "1.0.0")                          |
| `description` | Yes      | string      | Short description, max 300 chars               |
| `tools`       | Yes      | string[]    | Tool identifiers (see known tools list)        |
| `tags`        | No       | string[]    | Freeform tags, max 10, each max 30 chars       |
| `files`       | Yes      | FileEntry[] | At least 1 file                                |
| `postInstall` | No       | string[]    | Shell commands to run after file installation  |
| `readme`      | No       | string      | Path to README.md relative to setup root       |

### FileEntry Fields

| Field         | Required | Type   | Description                                                   |
| ------------- | -------- | ------ | ------------------------------------------------------------- |
| `source`      | Yes      | string | Path to file relative to setup root                           |
| `target`      | Yes      | string | Where to install the file. `~` = home dir, `./` = project dir |
| `placement`   | Yes      | string | `"global"`, `"project"`, or `"relative"`                      |
| `description` | No       | string | What this file does                                           |

### Known Tool Identifiers

The platform maintains a list of recognized tools for filtering and display:

```
claude-code, cursor, copilot, windsurf, codex, opencode, cline,
aider, continue, zed, neovim-ai, vscode-copilot
```

Users can specify any string, but recognized tools get icons and filter support.

## Config File Location

CLI config stored at `~/.coati/config.json`:

```json
{
	"token": "mg_abc123...",
	"apiBase": "https://coati.sh/api/v1",
	"username": "alice"
}
```

File permissions should be set to `600` (owner read/write only) on creation.
