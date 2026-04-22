# Agent File Mappings

How Coati recognizes AI agent config files and which agent (if any) each one belongs to in the UI.

The source of truth is [`packages/agents-registry/src/index.ts`](../packages/agents-registry/src/index.ts). This doc is a human-readable projection of that registry — update both together when adding or changing patterns.

## How categorization works

When a setup is browsed (file list, setup page, clone output), each file is grouped by its **agent** field:

- **Agent groups** (Claude Code, Codex, Copilot, Cursor, Gemini CLI, OpenCode) — files whose path matches one of that agent's patterns.
- **Shared** — files whose path matches a cross-agent pattern (no single agent owns them). These render under a "Shared" header in the UI.

The CLI detector (`cli/src/detector.ts`) resolves categories at `coati init` time:

1. **Shared patterns win first.** Cross-agent paths (e.g. `.agents/skills/**`) are emitted with no agent assignment, even if they would otherwise also match an agent pattern.
2. **Agent patterns are checked in registry order.** Within the agent loop, the first agent whose glob matches a path claims it.
3. **Scopes:** `projectGlobs` live inside a repo; `globalGlobs` live under the user's home directory. The same agent can own both.

Globs use `*` (single segment, no `/`), `**` (any depth), and `**/` (optional directory prefix). See `globToRegex` in the registry for exact semantics.

## Shared (cross-agent)

Patterns that any AI agent can consume — not attributed to a specific agent.

| Pattern                  | Component type | Notes                                             |
| ------------------------ | -------------- | ------------------------------------------------- |
| `.agents/skills/**/*.md` | `skill`        | Produced by Vercel's `skills.sh`; agent-agnostic. |

## Claude Code

Slug: `claude-code` · Website: <https://www.anthropic.com/claude-code> · CLI: `claude` · Home dir: `~/.claude`

**Project files:**

| Pattern                    | Component type |
| -------------------------- | -------------- |
| `CLAUDE.md`                | `instruction`  |
| `.claude/settings.json`    | `instruction`  |
| `.claude/commands/**/*.md` | `command`      |
| `.claude/hooks/**/*`       | `hook`         |
| `.claude/skills/**/*.md`   | `skill`        |
| `.mcp.json`                | `mcp_server`   |

**Home files:**

| Pattern                    | Component type |
| -------------------------- | -------------- |
| `.claude/settings.json`    | `instruction`  |
| `.claude/CLAUDE.md`        | `instruction`  |
| `.claude/commands/**/*.md` | `command`      |
| `.claude/hooks/**/*`       | `hook`         |
| `.claude/skills/**/*.md`   | `skill`        |

## Codex

Slug: `codex` · Website: <https://openai.com/codex> · CLI: `codex` · Home dir: `~/.codex`

**Project files:**

| Pattern                   | Component type |
| ------------------------- | -------------- |
| `AGENTS.md`               | `instruction`  |
| `.codex/config.toml`      | `instruction`  |
| `.codex/agents/**/*.toml` | `instruction`  |

**Home files:**

| Pattern              | Component type |
| -------------------- | -------------- |
| `.codex/config.toml` | `instruction`  |

## GitHub Copilot

Slug: `copilot` · Website: <https://github.com/features/copilot> · CLI: `gh` · Project-only (no home scope)

**Project files:**

| Pattern                           | Component type |
| --------------------------------- | -------------- |
| `.github/copilot-instructions.md` | `instruction`  |
| `.github/copilot/instructions.md` | `instruction`  |
| `.github/copilot/mcp.json`        | `mcp_server`   |
| `.github/copilot/agents.json`     | `instruction`  |
| `.github/copilot/firewall.json`   | `instruction`  |
| `.github/copilot/setup.sh`        | `hook`         |
| `.github/copilot/prompts/**/*.md` | `command`      |
| `.vscode/settings.json`           | `instruction`  |

## Cursor

Slug: `cursor` · Website: <https://cursor.com> · CLI: `cursor` · Home dir: `~/.cursor`

**Project files:**

| Pattern                    | Component type |
| -------------------------- | -------------- |
| `.cursorrules`             | `instruction`  |
| `.cursorignore`            | `instruction`  |
| `.cursorindexingignore`    | `instruction`  |
| `.cursor/rules/**/*.mdc`   | `instruction`  |
| `.cursor/rules/**/*.md`    | `instruction`  |
| `.cursor/mcp.json`         | `mcp_server`   |
| `.cursor/hooks.json`       | `hook`         |
| `.cursor/commands/**/*.md` | `command`      |
| `.cursor/skills/**/*.md`   | `skill`        |

**Home files:**

| Pattern                  | Component type |
| ------------------------ | -------------- |
| `.cursor/rules/**/*.mdc` | `instruction`  |
| `.cursor/settings.json`  | `instruction`  |

## Gemini CLI

Slug: `gemini` · Website: <https://ai.google.dev> · CLI: `gemini` · Home dir: `~/.gemini`

**Project files:**

| Pattern                      | Component type |
| ---------------------------- | -------------- |
| `GEMINI.md`                  | `instruction`  |
| `.geminiignore`              | `instruction`  |
| `.gemini/settings.json`      | `instruction`  |
| `.gemini/commands/**/*.toml` | `command`      |
| `.gemini/skills/**/*.md`     | `skill`        |
| `.gemini/policies/**/*.toml` | `instruction`  |

**Home files:**

| Pattern                 | Component type |
| ----------------------- | -------------- |
| `.gemini/settings.json` | `instruction`  |

## OpenCode

Slug: `opencode` · Website: <https://opencode.ai> · CLI: `opencode` · Home dir: `~/.config/opencode`

**Project files:**

| Pattern                      | Component type |
| ---------------------------- | -------------- |
| `opencode.md`                | `instruction`  |
| `.opencode.json`             | `instruction`  |
| `.opencode/commands/**/*.md` | `command`      |

**Home files:**

| Pattern                        | Component type |
| ------------------------------ | -------------- |
| `.config/opencode/config.json` | `instruction`  |

## Component type reference

| Type          | Meaning                                                                                |
| ------------- | -------------------------------------------------------------------------------------- |
| `instruction` | Project context, rules, or settings the agent reads on every session.                  |
| `command`     | A reusable slash-command / prompt template the user invokes explicitly.                |
| `skill`       | A richer command with metadata or trigger conditions; typically YAML-fronted markdown. |
| `hook`        | A shell/script file that runs at an agent lifecycle event (pre-commit, post-tool-use). |
| `mcp_server`  | An MCP (Model Context Protocol) server configuration.                                  |

## Adding a new pattern

1. Edit `packages/agents-registry/src/index.ts`:
   - Agent-owned: add to that agent's `projectGlobs` or `globalGlobs`.
   - Cross-agent: add to `SHARED_GLOBS` instead of any single agent.
2. Update the matching table in this doc.
3. Add a case to `packages/agents-registry/src/index.test.ts` (the `getAgentForFile` / `getComponentTypeForFile` table).
4. If the pattern introduces a new top-level directory, add a detector test in `cli/src/detector.test.ts` — the detector only descends into directories whose first segment appears in some glob.
