# Coati

**Share and discover AI coding setups.**

[![npm version](https://img.shields.io/npm/v/@coati/sh)](https://www.npmjs.com/package/@coati/sh)
[![license](https://img.shields.io/npm/l/@coati/sh)](https://github.com/jimburch/coati/blob/main/cli/LICENSE)

Coati is a platform for developers to share, discover, and install AI coding agent configurations. A **setup** packages your instructions, commands, skills, hooks, MCP servers, and other config files into a single, shareable unit — like a dotfiles repo, but purpose-built for AI agents.

Browse setups at [coati.sh](https://coati.sh) or use the CLI to clone them directly into your projects.

## Supported Agents

| Agent                                                 | Slug          | Scopes          |
| ----------------------------------------------------- | ------------- | --------------- |
| [Claude Code](https://www.anthropic.com/claude-code)  | `claude-code` | project, global |
| [Codex](https://openai.com/codex)                     | `codex`       | project, global |
| [Cursor](https://cursor.com)                          | `cursor`      | project, global |
| [Gemini CLI](https://ai.google.dev)                   | `gemini`      | project, global |
| [GitHub Copilot](https://github.com/features/copilot) | `copilot`     | project         |
| [OpenCode](https://opencode.ai)                       | `opencode`    | project, global |

Setups can target one agent, multiple agents, or all of them. Files can be tagged to a specific agent so only the relevant files are installed when you clone.

## Quick Start

### Install

```bash
npm install -g @coati/sh
```

Or run commands without installing:

```bash
npx @coati/sh@latest <command>
```

### Clone a setup

```bash
coati login
coati clone owner/setup-name
```

That's it. The CLI detects which agents you have installed, downloads the matching files, and places them in the right location.

## Commands

| Command                    | Description                      |
| -------------------------- | -------------------------------- |
| `coati login`              | Authenticate via GitHub          |
| `coati logout`             | Remove stored credentials        |
| `coati clone <owner/slug>` | Clone a setup to your machine    |
| `coati init`               | Scaffold a `coati.json` manifest |
| `coati publish`            | Publish or update a setup        |

All commands support `--json` for machine-readable output. Run `coati <command> --help` for full options.

### `coati login`

Authenticates using the GitHub Device Flow. The CLI gives you a URL and a code — open the URL, enter the code, and you're logged in. Credentials are stored locally at `~/.coati/config.json`.

```bash
coati login
coati login --force    # Re-authenticate even if already logged in
```

### `coati clone <owner/slug>`

Downloads and installs a setup's files to your machine.

```bash
coati clone jimburch/my-sveltekit-setup
```

**Agent filtering:** If a setup supports multiple agents, the CLI auto-detects which agents you have installed and only downloads the relevant files. Override with `--agent <slug>`:

```bash
coati clone owner/setup --agent claude-code
```

**Placement:** By default, files are placed in your current directory (project scope). Use `--global` for home directory placement or `--dir` for a custom destination:

```bash
coati clone owner/setup --global          # Install to ~/
coati clone owner/setup --dir ./my-dir    # Custom destination
```

**Conflict handling:** When files already exist, the CLI prompts you to overwrite, skip, back up, or view a diff. Use `--force` to overwrite everything without prompting.

**Other useful flags:**

- `--dry-run` — preview what would be installed without writing anything
- `--pick` — interactively select which files to install
- `--no-post-install` — skip any post-install commands defined by the setup

### `coati init`

Scaffolds a `coati.json` manifest in your current directory. The CLI scans for existing AI config files (like `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, etc.), groups them by agent, and walks you through selecting which files to include.

```bash
coati init
```

You'll be prompted for a name, description, category, and tags. The manifest is written to `./coati.json`.

### `coati publish`

Publishes your setup to [coati.sh](https://coati.sh). If you don't have a `coati.json` yet, the CLI will run `coati init` first.

```bash
coati publish
```

On first publish, the CLI assigns an `id` to your manifest and writes it back to `coati.json`. Subsequent runs update the existing setup.

## The `coati.json` Manifest

The manifest describes your setup and its files. Here's an annotated example:

```json
{
	"name": "my-ai-workflow",
	"version": "1.0.0",
	"description": "Claude Code + Cursor setup for SvelteKit projects",
	"agents": ["claude-code", "cursor"],
	"category": "web-dev",
	"tags": ["svelte", "typescript"],
	"postInstall": ["pnpm install"],
	"files": [
		{ "path": "CLAUDE.md", "componentType": "instruction", "agent": "claude-code" },
		{ "path": ".cursorrules", "componentType": "instruction", "agent": "cursor" },
		{ "path": ".claude/commands/deploy.md", "componentType": "command", "agent": "claude-code" },
		{
			"path": "AGENTS.md",
			"componentType": "instruction",
			"description": "Shared across all agents"
		}
	]
}
```

### Fields

| Field           | Required | Description                                                                 |
| --------------- | -------- | --------------------------------------------------------------------------- |
| `name`          | Yes      | URL-safe slug (lowercase, hyphens, 3-100 chars)                             |
| `version`       | Yes      | Semver string (e.g. `1.0.0`)                                                |
| `description`   | Yes      | Short summary (max 300 chars)                                               |
| `files`         | Yes      | Array of file entries (at least one)                                        |
| `agents`        | No       | Agent slugs this setup targets                                              |
| `category`      | No       | One of: `web-dev`, `mobile`, `data-science`, `devops`, `systems`, `general` |
| `tags`          | No       | Freeform labels for discovery                                               |
| `license`       | No       | License identifier (e.g. `MIT`)                                             |
| `postInstall`   | No       | Shell commands to run after cloning                                         |
| `prerequisites` | No       | Setup steps to display before install                                       |

Fields like `id`, `source`, `sourceId`, `clonedAt`, and `revision` are auto-managed by the CLI — you don't need to set them.

### Component Types

Each file entry can declare a `componentType` to describe what it does:

| Type           | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `instruction`  | Agent instructions and rules (e.g. `CLAUDE.md`, `.cursorrules`) |
| `command`      | Slash commands or prompt templates                              |
| `skill`        | Reusable agent skills                                           |
| `mcp_server`   | MCP server configuration                                        |
| `hook`         | Lifecycle hooks (pre/post actions)                              |
| `config`       | General configuration files                                     |
| `policy`       | Governance or policy rules                                      |
| `agent_def`    | Agent definition files                                          |
| `ignore`       | Ignore patterns (e.g. `.claudeignore`)                          |
| `setup_script` | Scripts that run during setup                                   |

## Global vs Project Scope

Setups can be installed at two scopes:

- **Project** (default) — files are placed in your current working directory. Use this for project-specific configurations like `CLAUDE.md` or `.cursorrules`.
- **Global** (`--global`) — files are placed in your home directory (`~/`). Use this for machine-wide settings like `~/.claude/settings.json`.

Which scopes are available depends on the agent. Most agents support both project and global scope; GitHub Copilot supports project scope only.

### Agent-tagged files

Individual files in a setup can be tagged with an `agent` field. When you clone a multi-agent setup, the CLI detects which agents you have installed and skips files for agents you don't use. Files without an `agent` tag are always installed.

For example, cloning a setup with both Claude Code and Cursor files while only having Claude Code installed will skip the `.cursorrules` file and install everything else.

## Configuration

Credentials and settings are stored at `~/.coati/config.json` (permissions `0600`). This file is managed by the CLI — you generally don't need to edit it.

## Telemetry

When an unhandled error occurs, the CLI sends a crash report to [Sentry](https://sentry.io). This helps us diagnose and fix bugs. The crash report includes the error message, stack trace, the subcommand that was running, and an anonymous device ID. After you run `coati login`, your Coati user ID is also attached to crash reports.

**The CLI does not track analytics events.** It only sends data when something crashes.

For full details on what is and isn't collected, see the [Coati Privacy Policy](https://coati.sh/privacy).

### Opting out

Crash reporting is opt-out. Use any of the following methods:

**Per-session (standard `DO_NOT_TRACK`):**

```bash
DO_NOT_TRACK=1 coati clone owner/setup
```

**Per-session (Coati-specific):**

```bash
COATI_TELEMETRY=false coati publish
```

**Persistent (edit `~/.coati/config.json`):**

```json
{ "telemetry": false }
```

When crash reporting is disabled, errors are still shown in your terminal — they are just not sent to Sentry.

## Links

- [Website](https://coati.sh)
- [Browse setups](https://coati.sh/explore)
- [GitHub](https://github.com/jimburch/coati)
- [Contributing](https://github.com/jimburch/coati/blob/main/CONTRIBUTING.md)
