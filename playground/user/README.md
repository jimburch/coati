# User-Level (Global) Playground

This directory demonstrates a **global/user-level setup** — config files that live in your
home directory (`~/`) and apply to **all projects** on your machine, not just one project.

It covers three agents with meaningful global config stories: **Claude Code**, **Gemini CLI**, and **Codex**.

## What's Here

All files use `placement: "global"` in `setup.json`, meaning they install to `~/` paths.

### Claude Code (`~/.claude/`)

| Source file                  | Installed to                   | Purpose                                          |
| ---------------------------- | ------------------------------ | ------------------------------------------------ |
| `.claude/settings.json`      | `~/.claude/settings.json`      | Global model preferences and permission defaults |
| `.claude/CLAUDE.md`          | `~/.claude/CLAUDE.md`          | Personal instructions applied to every project   |
| `.claude/commands/commit.md` | `~/.claude/commands/commit.md` | Global `/commit` slash command for all projects  |

### Gemini CLI (`~/.gemini/`)

| Source file             | Installed to              | Purpose                                        |
| ----------------------- | ------------------------- | ---------------------------------------------- |
| `.gemini/settings.json` | `~/.gemini/settings.json` | Global model, sandbox, and display preferences |

### Codex (`~/.codex/`)

| Source file          | Installed to           | Purpose                                              |
| -------------------- | ---------------------- | ---------------------------------------------------- |
| `.codex/config.toml` | `~/.codex/config.toml` | Global model, approval mode, history, sandbox config |

## How Global Placement Works

In `setup.json`, every file entry has `"placement": "global"` and a target starting with `~/`:

```json
{
	"source": ".claude/CLAUDE.md",
	"target": "~/.claude/CLAUDE.md",
	"placement": "global",
	"componentType": "instruction",
	"agent": "claude-code"
}
```

When `magpie clone` installs a global setup, it expands `~` to the user's home directory
and places each file there, rather than in the current project directory.

## Usage with Magpie CLI

```bash
# Clone this global setup to your home directory
magpie clone @jim/global-ai-coding-setup

# Initialize a new setup from your existing home-directory configs
magpie init

# Publish your personal global setup
magpie publish
```
