# What Antigravity CLI reads, and what happens to Gemini CLI in the registry

Research for the issue "What does Antigravity CLI read, and what happens to Gemini CLI in the registry?". It follows on from the Gemini CLI section of [`agent-config-locations.md`](agent-config-locations.md), which noted the 2026-06-18 switch but didn't look at Antigravity's paths. Sources are Google's Antigravity docs (`antigravity.google/docs/...`), the Google Developers Blog, the `google-antigravity/antigravity-cli` and `google-gemini/gemini-cli` GitHub repos, and repo facts cited as `file:line`. Research date: 2026-11-02. Most docs pages were read through a summarizing fetch tool, so "not documented" below means "not stated on the page I fetched", not "does not exist". The Antigravity CLI changelog was downloaded raw and grepped. Items marked **(unconfirmed)** have no primary source behind them.

## Summary

- **Antigravity CLI is a separate product, not a rename of Gemini CLI.** Its binary is `agy`, it installs from a curl/PowerShell script, and its source isn't public. Its config layout is new: workspace files go in `.agents/`, global files in `~/.gemini/config/`, and CLI settings in `~/.gemini/antigravity-cli/settings.json`. MCP servers live in their own `mcp_config.json` and hooks in their own `hooks.json`. It has no file-based custom commands.
- **It still reads some Gemini CLI paths:** `GEMINI.md` (with `AGENTS.md`) in the workspace and its parents, `~/.gemini/GEMINI.md`, and `~/.gemini/skills/` (CLI only). It does **not** read `.gemini/skills/` in a workspace; those have to be moved to `.agents/skills/`. Gemini CLI's `settings.json` MCP servers and extensions are converted by a one-off import (`agy plugin import gemini`, or first-launch onboarding), not read at runtime.
- **Gemini CLI is still maintained.** It now targets enterprise Gemini Code Assist customers and paid API keys. v0.66.0 shipped on 2026-10-27 and nightlies are still published daily. It was retired only for free, Google AI Pro/Ultra and Google One users.
- **Placeholders:** no project-directory variable like `$GEMINI_PROJECT_DIR` is documented for workspace hooks or MCP. Hook commands get `workspacePaths` as JSON on stdin. Plugin MCP servers get `${PLUGIN_ROOT}`, `${PLUGIN_DATA}` and user-declared `${NAME}` variables.
- **Recommendation: (c).** Add Antigravity as a new Agent (slug `antigravity`) next to Gemini CLI, and keep Gemini CLI's slug, which is `gemini` (not `gemini-cli`), as it is.

## Path table

`P` = workspace (the dir where `agy` starts, plus each parent up to the repo root unless noted). `G` = global (`~`). "In shared file" marks content that is a key inside a settings file rather than its own file. The Antigravity CLI, App and IDE extensions share the same `.agents/` and `~/.gemini/config/` layout; CLI-only paths are marked.

| Agent        | File type           | Project path                                                                                                                   | Global path                                                                                                                                                | Own file?                           |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| antigravity  | instructions        | `AGENTS.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/GEMINI.md`                                                             | `~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.gemini/config/AGENTS.md`, `~/.gemini/config/GEMINI.md` (the IDE doesn't list the `config/` pair)         | yes                                 |
| antigravity  | rules (frontmatter) | `.agents/rules/*.md` (legacy `.agent/rules/*.md`); top level only unless listed in `.agents/rules.json`                        | `~/.gemini/config/rules/*.md`                                                                                                                              | yes                                 |
| antigravity  | skills              | `.agents/skills/<name>/SKILL.md` (legacy `.agent/skills`); **not** `.gemini/skills`                                            | `~/.gemini/config/skills/<name>/SKILL.md`; CLI only: `~/.gemini/skills/`, `~/.gemini/antigravity-cli/skills/`; IDE legacy: `~/.gemini/antigravity/skills/` | yes                                 |
| antigravity  | custom agents       | `.agents/agents/<name>.md` or `.agents/agents/<name>/agent.md`                                                                 | `~/.gemini/config/agents/<name>.md` or `.../<name>/agent.md`                                                                                               | yes                                 |
| antigravity  | hooks               | `.agents/hooks.json`                                                                                                           | `~/.gemini/config/hooks.json`                                                                                                                              | yes (not read from `settings.json`) |
| antigravity  | MCP                 | `.agents/mcp_config.json`                                                                                                      | `~/.gemini/config/mcp_config.json`                                                                                                                         | yes                                 |
| antigravity  | plugins             | `.agents/plugins/<plugin>/` (`plugin.json` or `.antigravity-plugin/plugin.json`)                                               | `~/.gemini/config/plugins/<plugin>/`                                                                                                                       | yes (directory)                     |
| antigravity  | discovery manifests | `.agents/skills.json`, `rules.json`, `agents.json`, `plugins.json`                                                             | same names in `~/.gemini/config/`                                                                                                                          | yes                                 |
| antigravity  | settings            | none documented; `.gemini/config.json` at repo root sets `personal_customization_dir`                                          | `~/.gemini/antigravity-cli/settings.json` (CLI), `~/.gemini/antigravity-cli/keybindings.json`, `~/.gemini/config/config.json`                              | yes                                 |
| antigravity  | permissions         | n/d                                                                                                                            | `permissions` key in `~/.gemini/antigravity-cli/settings.json`; per-project overrides in `~/.gemini/config/projects/`                                      | in shared file                      |
| antigravity  | commands            | none: no file-based custom slash commands; skills show up as `/<name>`                                                         | none                                                                                                                                                       | n/a                                 |
| antigravity  | workflows (legacy)  | `.agents/workflows/<name>.md`, sunset 2026-10-19                                                                               | `~/.gemini/config/workflows/<name>.md`                                                                                                                     | yes                                 |
| gemini (CLI) | for comparison      | `GEMINI.md`; `.gemini/settings.json` (holds MCP and hooks); `.gemini/commands/**/*.toml`; `.gemini/skills/`, `.agents/skills/` | `~/.gemini/GEMINI.md`; `~/.gemini/settings.json`; `~/.gemini/commands/`; `~/.gemini/skills/`, `~/.agents/skills/`                                          | MCP and hooks in shared file        |

Sources for each row are in the sections below.

## Instructions and rules

Antigravity loads `AGENTS.md` and `GEMINI.md` from the workspace folder and each parent up to the folder holding `.git`. It also loads `.agents/AGENTS.md`, `.agents/GEMINI.md` and `.agents/rules/*.md` from those same folders, plus legacy `.agent/rules/*.md`. Subfolders below the workspace are not scanned ([rules](https://antigravity.google/docs/rules/), [customization discovery](https://antigravity.google/docs/customization-discovery/)). `AGENTS.md` and `GEMINI.md` are plain Markdown and always on. Every file in `rules/` needs YAML frontmatter with a valid `trigger` (`model_decision`, `always_on`, `glob`, `manual`), and files without one are silently discarded. The CLI doesn't support `manual` ([rules](https://antigravity.google/docs/rules/)). Global standalone files are `~/.gemini/AGENTS.md`, `~/.gemini/GEMINI.md`, `~/.gemini/config/AGENTS.md` and `~/.gemini/config/GEMINI.md`, and modular global rules go in `~/.gemini/config/rules/*.md`. The IDE section of that page omits the `config/` standalone pair ([rules](https://antigravity.google/docs/rules/)). All rules are cumulative. Limits are 24,000 bytes per file and a 20,000-token budget shared by global and `always_on` rules (same page). Changelog 1.4.4 says `GEMINI.md`/`AGENTS.md` rules override built-in instructions, and 1.2.15 names all four global files ([CHANGELOG](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)). The Gemini CLI migration guide says existing `GEMINI.md`/`AGENTS.md` files need no changes and `~/.gemini/GEMINI.md` is still consulted ([gcli-migration](https://antigravity.google/docs/cli/gcli-migration)).

## Skills

Workspace skills go in `.agents/skills/<name>/SKILL.md`, read from each parent up to the repo root, and `.agent/skills` still works for backward compatibility. Global skills go in `~/.gemini/config/skills/`. The CLI also reads `~/.gemini/skills/` and `~/.gemini/antigravity-cli/skills/` (the App doesn't), and the IDE reads the legacy `~/.gemini/antigravity/skills/`. A skill folder can also hold `scripts/`, `examples/` and `resources/` ([skills](https://antigravity.google/docs/skills/)). The CLI-only folders take priority over all other skills. Otherwise same-name precedence is: personal folder in the repo, then workspace, then `~/.gemini/config/`, then built-in ([customization discovery](https://antigravity.google/docs/customization-discovery/)). Workspace `.gemini/skills/` is **not** read: the migration guide says users "must manually rename or relocate the folder to `.agents/skills/`" ([gcli-migration](https://antigravity.google/docs/cli/gcli-migration)). `~/.agents/skills` and `.claude/skills` are not mentioned on any page I fetched, so Antigravity is not confirmed to read them, unlike Gemini CLI, Codex, Copilot, Cursor and OpenCode (see [agent-config-locations.md](agent-config-locations.md)).

## Commands

No page documents file-based custom slash commands. The slash-commands page lists only built-ins ([slash commands](https://antigravity.google/docs/slash-commands/)). Skills are invoked as `/<skill-name>` ([workflows to skills](https://antigravity.google/docs/migration/workflows-to-skills/), [build plugins](https://antigravity.google/docs/build-plugins/)). The old workflows (`.agents/workflows/<name>.md`, `~/.gemini/config/workflows/<name>.md`) "will stop working on October 19, 2026" ([workflows to skills](https://antigravity.google/docs/migration/workflows-to-skills/)). Changelog 1.4.3 warns that `commands/` folders in plugins aren't loaded ([CHANGELOG](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)). For Gemini CLI's `.gemini/commands/*.toml`, the only documented path is `agy plugin import gemini`, which converts extension commands to skills ("4 legacy commands converted to skills") ([gcli-migration](https://antigravity.google/docs/cli/gcli-migration)). Whether loose `.gemini/commands/*.toml` files outside an extension are read or imported is **(unconfirmed)**: no page mentions TOML, and the changelog has no TOML entry.

## Hooks

Hooks are a separate file, not a settings key: `.agents/hooks.json` (workspace) and `~/.gemini/config/hooks.json` (global), the same for the CLI, App and IDE. The docs say hooks in `~/.gemini/antigravity-cli/settings.json` are not loaded ([hooks](https://antigravity.google/docs/hooks/)). Changelog 1.0.x fixed `/hooks` writing to `~/.gemini/antigravity-cli/hooks.json` instead of the shared `~/.gemini/config/hooks.json` ([CHANGELOG](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md)). The format is new. Each top-level key is a hook name with an optional `enabled`, and the events are `SessionStart`, `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation` and `Stop`. `PreToolUse` and `PostToolUse` take `matcher` + `hooks` arrays, and handlers are `{type: "command", command, timeout}` ([hooks](https://antigravity.google/docs/hooks/)). Hooks in Gemini CLI's `settings.json` are not mentioned by the migration guide. That they're ignored is implied by the "not loaded from settings.json" note but **(unconfirmed)** for `~/.gemini/settings.json` specifically.

## MCP

MCP servers live in their own file: `.agents/mcp_config.json` (workspace) and `~/.gemini/config/mcp_config.json` (global), with a root `mcpServers` map. Keys are `command`, `args`, `env`, `cwd`, `serverUrl` (or `url`), `headers`, `authProviderType`, `oauth`, `disabled`, `enabledTools`, `disabledTools` and `timeoutSeconds`. Remote servers must use Streamable HTTP, and `httpUrl` and the legacy SSE transport are not supported. How workspace and global servers merge is not documented ([MCP](https://antigravity.google/docs/mcp/)). The migration guide describes Gemini CLI's MCP servers as "declared inline within `~/.gemini/settings.json`". It says the import moves them into `mcp_config.json` and swaps `url`/`httpUrl` for `serverUrl` ([gcli-migration](https://antigravity.google/docs/cli/gcli-migration)). `agy mcp add/remove/list/enable/disable` edits the user-level file (CHANGELOG, `mcp` subcommands entry).

## Settings

CLI settings: `~/.gemini/antigravity-cli/settings.json` and `~/.gemini/antigravity-cli/keybindings.json`. The documented keys cover preferences, safety (`toolPermission`, `enableTerminalSandbox`, `allowNonWorkspaceAccess`), model, `trustedWorkspaces`, `permissions`, `statusLine` and so on. No project-level `settings.json` is documented, and neither is any env var that relocates the home dir (no `GEMINI_CLI_HOME` equivalent) ([settings](https://antigravity.google/docs/settings/), [CLI reference](https://antigravity.google/docs/cli/reference/)). A repo-root `.gemini/config.json` can set `personal_customization_dir` ([customization discovery](https://antigravity.google/docs/customization-discovery/)). Project permission overrides live in `~/.gemini/config/projects/` (CHANGELOG, permission-merging entry). Whether `agy` reads a project's `.gemini/settings.json` at runtime is **(unconfirmed)**. No page says it does, and the migration guide covers it only as an import source for MCP servers.

## Relationship to Gemini CLI

- **Separate tool, new harness.** Google announced Antigravity CLI on 2026-05-19 as part of Antigravity 2.0. Gemini CLI and the Code Assist IDE extensions stopped serving free, Google AI Pro/Ultra and Code Assist-for-individuals users on 2026-06-18, while Standard/Enterprise licenses keep access. Gemini CLI "will remain accessible via paid Gemini and Gemini Enterprise Agent Platform API keys". Skills, Hooks, Subagents and Extensions (now "Antigravity plugins") carry over, without "1:1 feature parity right out of the gate" ([Google Developers Blog](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli)). The `google-antigravity/antigravity-cli` repo holds only a README, CHANGELOG, examples and issue templates, and has no license ([repo](https://github.com/google-antigravity/antigravity-cli), checked via `gh api` 2026-11-02). Gemini CLI is open source under Apache-2.0 ([repo](https://github.com/google-gemini/gemini-cli)).
- **Gemini CLI is still maintained.** Its README says it's "maintained for enterprise Gemini Code Assist workflows on Google Cloud" and that free and AI Pro/Ultra users "moved to Antigravity CLI on June 18, 2026". The repo isn't archived ([repo](https://github.com/google-gemini/gemini-cli)). The latest stable release is v0.66.0 (2026-10-27), and nightly `v0.67.0-nightly.20261102` came out on 2026-11-02 ([releases](https://github.com/google-gemini/gemini-cli/releases), via `gh api`). Install is `npm install -g @google/gemini-cli`, binary `gemini`.
- **Antigravity binary and install.** The binary is `agy`. Install with `curl -fsSL https://antigravity.google/cli/install.sh | bash` (macOS/Linux) or `irm https://antigravity.google/cli/install.ps1 | iex` (Windows PowerShell), which puts it at `~/.local/bin/agy` or `%LOCALAPPDATA%\agy\bin` ([getting started](https://antigravity.google/docs/getting-started/)). The install scripts take a `--skip-aliases` flag that "bypasses shell alias purging" ([install](https://antigravity.google/docs/install/)). Whether those purged aliases include `gemini` is **(unconfirmed)**.
- **Shared home dir.** Both tools use `~/.gemini/`. Gemini CLI uses its top level (`settings.json`, `commands/`, `skills/`, `GEMINI.md`, `extensions/`). Antigravity uses `~/.gemini/config/`, `~/.gemini/antigravity-cli/` and `~/.gemini/antigravity/` (OAuth tokens, App data), and also reads `~/.gemini/GEMINI.md`, `~/.gemini/AGENTS.md` and `~/.gemini/skills/` ([MCP](https://antigravity.google/docs/mcp/), [hooks](https://antigravity.google/docs/hooks/), [skills](https://antigravity.google/docs/skills/)). A user can run both side by side.
- **Migration.** On first launch, `agy` offers to convert the extensions and global configs you select, move session tokens into the OS keyring, and map visual settings. `agy plugin import gemini` converts `~/.gemini/extensions/` (and `agy plugin import claude` converts `~/.claude/plugins/`) into native plugins ([gcli-migration](https://antigravity.google/docs/cli/gcli-migration), [plugins](https://antigravity.google/docs/plugins/)).

## Portable placeholders

- **Workspace and global hooks:** no project-dir variable is documented. `$GEMINI_PROJECT_DIR`, `$ANTIGRAVITY_PROJECT_DIR` and `$CLAUDE_PROJECT_DIR` appear on no page I fetched and nowhere in the changelog. Hooks get `workspacePaths`, `transcriptPath`, `artifactDirectoryPath`, `conversationId`, `modelName` (and, since 1.4.7, `lastUserInput`) as JSON on stdin ([hooks](https://antigravity.google/docs/hooks/), CHANGELOG). The examples use relative commands like `./scripts/lint.sh`, but the base dir for workspace hooks is not stated, so that is **(unconfirmed)**. Plugin hooks run with the plugin root as `cwd` ([build plugins](https://antigravity.google/docs/build-plugins/)).
- **Workspace and global MCP:** the MCP page documents no interpolation ([MCP](https://antigravity.google/docs/mcp/)).
- **Plugin MCP:** `${PLUGIN_ROOT}` (read-only plugin dir) and `${PLUGIN_DATA}` (writable per-plugin dir) expand in `args`, `cwd` and `env`. User-declared `variables` expand as `${NAME}` in `command`, `args`, `env`, `url`, `headers` and `oauth` ([build plugins](https://antigravity.google/docs/build-plugins/)). On import, Gemini's `${extensionPath}` and Claude's `${CLAUDE_PLUGIN_ROOT}` are rewritten to the installed plugin dir (CHANGELOG 1.4.11 and the `${extensionPath}` fix entry).
- **Settings:** a leading `~` expands in `statusLine` and `title` commands only ([settings](https://antigravity.google/docs/settings/)).

## Registry today

The Gemini CLI entry is at `packages/agents-registry/src/index.ts:204-225`, and its slug is **`gemini`** (`:206`), not `gemini-cli`. Its `projectGlobs` are `GEMINI.md`, `.geminiignore`, `.gemini/settings.json`, `.gemini/commands/**/*.toml`, `.gemini/skills/**/*.md` and `.gemini/policies/**/*.toml` (`:212-217`). `globalGlobs` has only `.gemini/settings.json` (`:219`). Detection is `homePaths: ['.gemini']` and `cliCommands: ['gemini']` (`:221-222`). The slug is also seeded in the `agents` table by `drizzle/0003_tools_to_agents.sql:55`, and is used in `src/lib/utils/agent-icons.ts:14`, `packages/agents-registry/src/index.test.ts:15,66,153-158`, `cli/src/detector.test.ts:224-264` and `scripts/seed-dev.ts`. `.agents/skills/**/*.md` is a `SHARED_GLOBS` entry (`index.ts:261-263`), and `getAgentForFile` gives a path to the first agent in registry order that matches it.

None of Gemini CLI's own globs depend on Antigravity, so option (c) leaves the `gemini` entry as it is. The gaps listed in [agent-config-locations.md](agent-config-locations.md#registry-discrepancies) still apply to it.

## Recommendation: (c) add Antigravity as a new Agent, keep `gemini`

In Coati an **Agent** is identified by the files it reads (`CONTEXT.md:16`). Antigravity and Gemini CLI overlap on only three paths: `GEMINI.md`, `~/.gemini/GEMINI.md` and `~/.gemini/skills/`. Everything else is different:

| Thing    | Gemini CLI                        | Antigravity                               |
| -------- | --------------------------------- | ----------------------------------------- |
| Settings | `.gemini/settings.json`           | `~/.gemini/antigravity-cli/settings.json` |
| MCP      | inside `settings.json`            | `mcp_config.json`                         |
| Hooks    | inside `settings.json`            | `hooks.json`, with different events       |
| Commands | `.gemini/commands/*.toml`         | none                                      |
| Skills   | `.gemini/skills` in the workspace | `.agents/skills`                          |

A **Setup** written for one wouldn't be placed correctly for the other. Gemini CLI is still released and supported for enterprise users, so it shouldn't be dropped.

- **(a) Rename `gemini` to Antigravity:** rejected. Every glob would change, so this is really a new Agent wearing the old slug, and Gemini CLI users would lose their Agent.
- **(b) Change the slug:** nothing to gain. `gemini` is accurate for Gemini CLI. If you want the slug to match the display name, `gemini` to `gemini-cli` is cheap now that there are no users, but it's optional. It would need a migration for the `agents` row and the test updates listed above.
- **(d) Drop Gemini CLI:** rejected. It's maintained (v0.66.0, nightlies through 2026-11-02) and still the supported harness for Code Assist Standard/Enterprise.

Suggested new entry: slug `antigravity` and display name "Antigravity". Name it after the harness, not "Antigravity CLI", because the App and IDE extensions read the same `.agents/` and `~/.gemini/config/` files, and CONTEXT.md counts one harness across surfaces as one Agent. Suggested values (the registry has no subagent, settings or plugin `ComponentType`, so those are typed `instruction`, as for other agents today):

- `projectGlobs`:
  - instruction: `.agents/AGENTS.md`, `.agents/GEMINI.md`, `.agents/rules/*.md`, `.agents/agents/**/*.md`, `.agents/rules.json`, `.agents/agents.json`
  - skill: `.agents/skills.json`
  - hook: `.agents/hooks.json`
  - mcp_server: `.agents/mcp_config.json`
  - `.agents/plugins/**`, typed by content
  - Root `AGENTS.md` and `GEMINI.md` are also read, but `getAgentForFile` already gives them to `codex` and `gemini`. `.agents/skills/**` stays in `SHARED_GLOBS`.
- `globalGlobs`:
  - instruction: `.gemini/AGENTS.md`, `.gemini/GEMINI.md`, `.gemini/config/AGENTS.md`, `.gemini/config/GEMINI.md`, `.gemini/config/rules/*.md`, `.gemini/config/agents/**/*.md`, `.gemini/antigravity-cli/settings.json`
  - skill: `.gemini/config/skills/**`, `.gemini/antigravity-cli/skills/**`, `.gemini/skills/**`
  - hook: `.gemini/config/hooks.json`
  - mcp_server: `.gemini/config/mcp_config.json`
  - `.gemini/config/plugins/**`
- `detection`: `homePaths: ['.gemini/antigravity-cli', '.gemini/config']`, **not** `.gemini`, since both tools write there and `gemini` already claims it. `cliCommands: ['agy']`.
- `scopes`: `['project', 'global']`.
- Needs a new `agents` row (migration), an icon and test fixtures.

Open design points for whoever implements it:

1. `~/.gemini/GEMINI.md` and `~/.gemini/skills/` are read by both Agents, so a global **Placement** of those files serves both. The registry's first-match rule will credit them to whichever entry comes first.
2. Legacy `.agent/` (singular) dirs are still read, but adding them is probably not worth it with no users.
3. `.agents/workflows/` is past its 2026-10-19 sunset and should not be added.

## Unconfirmed or weak

- Whether `agy` reads a project's `.gemini/settings.json`, loose `.gemini/commands/*.toml` / `~/.gemini/commands/*.toml`, or hooks in `~/.gemini/settings.json` at runtime. No page says it does, the migration guide treats these only as import sources, and the evidence leans to "no".
- The base dir for relative commands in workspace `.agents/hooks.json`.
- Whether variable interpolation (`${NAME}` `variables`) works in workspace/global `mcp_config.json` or only in plugin MCP configs. It's documented only for plugins.
- How workspace and global MCP servers merge.
- `~/.agents/skills` and `.claude/skills` support. Neither is mentioned, so treat as not read.
- Whether the install script's "alias purging" removes a `gemini` alias.
- Docs pages were read through a summarizing fetcher, and the Gemini CLI migration guide was summarized rather than quoted in full. The `antigravity.google` docs are a JS site whose content was rendered for the fetcher, so a re-check in a browser is cheap insurance before implementing.

## Recheck (2026-11-02, for #404)

The docs pages were refetched and render as server-side HTML. The CHANGELOG was rechecked too.

- **`hooks.json` shape: confirmed** ([hooks](https://antigravity.google/docs/hooks/)).
  - Each top-level key is a hook name holding an optional `enabled` plus event keys.
  - `PreToolUse`/`PostToolUse` take `[{ matcher, hooks: [{ type?, command, timeout? }] }]`.
  - `SessionStart`, `PreInvocation`, `PostInvocation` and `Stop` take handlers directly, and the matcher is ignored.
  - The registry ships one fragment per named hook (`<hookName>`).
- **Still unconfirmed:**
  - whether `agy` reads a project `.gemini/settings.json` at runtime
  - whether it reads loose `.gemini/commands/*.toml` (leans no; only `agy plugin import gemini` converts commands)
  - the base dir for relative commands in `.agents/hooks.json`
  - `${VAR}` interpolation in non-plugin `mcp_config.json` (documented only for plugin MCP servers)
  - `~/.agents/skills` (leans no; `/skills` and `/customization-discovery` list only `.agents/skills/`, `~/.gemini/config/skills/`, `~/.gemini/antigravity-cli/skills/` and `~/.gemini/skills/`)
- **Effect on the registry:** none of these are added, and Antigravity uses Coati tokens with no `envRef` (spec #402 §4).
