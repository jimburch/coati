# Personal AI Dotfiles

A cross-agent "dotfiles" setup that installs to your home directory and
travels with you across every project. This setup gives Claude Code,
Gemini CLI, and Codex CLI a consistent personality — your coding style,
your commit conventions, your universal workflow commands — no matter what
repo you open.

Works like traditional dotfiles: clone once, install globally, and every
project you touch inherits it.

## What's inside

### Claude Code (`~/.claude/`)

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | Your coding preferences, shown to Claude in every project |
| `settings.json` | Model, permissions, hooks, include-co-authored |
| `commands/commit.md` | `/commit` — Conventional Commits with your preferred style |
| `commands/pr.md` | `/pr` — opens a PR with a body you'd actually write |
| `commands/standup.md` | `/standup` — summarizes yesterday's git activity |
| `commands/focus.md` | `/focus` — reduces distraction (closes unrelated tabs of context) |

### Gemini CLI (`~/.gemini/`)

| Path | Purpose |
| --- | --- |
| `settings.json` | Default model, telemetry off, permission policy |
| `commands/commit.toml` | Same commit workflow as Claude's `/commit` |
| `commands/pr.toml` | Same PR workflow as Claude's `/pr` |
| `commands/standup.toml` | Daily standup summary |

### Codex CLI (`~/.codex/`)

| Path | Purpose |
| --- | --- |
| `config.toml` | Default model, sandbox policy, approval policy |
| `AGENTS.md` | User-scoped coding preferences |

## Install

Via coati:

```bash
coati clone <you>/personal-dotfiles
# prompts for scope → default is "global" (installs to ~/)
```

Or manually: copy each directory to the corresponding `~/` location.

## Design principles

These dotfiles are **opinionated, not exhaustive**. They set the tone —
what to commit, how to write PR bodies, how to name branches — without
prescribing what to build. Project-level CLAUDE.md / AGENTS.md files in
individual repos add project-specific rules on top.
