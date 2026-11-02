# Where each Agent keeps its project and global config

Research for jimburch/coati#392. Coati is removing the `coati.json` manifest and needs to know where a Setup's "Local copy" can live (project dir vs home dir); this note surveys where each of the six registered Agents (claude-code, codex, copilot, cursor, gemini, opencode) reads project-scope and global-scope config, how the scopes interact, which config embeds machine-specific values, and where `packages/agents-registry/src/index.ts` disagrees with the vendors' docs. Sources are each vendor's official docs or official repos, plus repo facts cited as `file:line`. Research date: 2026-10-15. Docs were fetched through a summarizing fetch tool, so "not documented" below means "not stated on the page I fetched", not "does not exist". Items marked **(weak)** rest on a single page or an unverified redirect.

## Summary table

`P` = project (repo root), `G` = global (`~` unless noted). "n/d" = not documented on the fetched page. Component types follow the registry (`index.ts:10`) plus extra rows (settings, rules, subagents) the registry has no type for.

| Agent       | File type                  | Project path                                                                                                  | Global path                                                                                                 |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| claude-code | instructions               | `CLAUDE.md` or `.claude/CLAUDE.md`; `CLAUDE.local.md`; `AGENTS.md` only if no CLAUDE.md                       | `~/.claude/CLAUDE.md`                                                                                       |
| claude-code | rules                      | `.claude/rules/**/*.md`                                                                                       | `~/.claude/rules/`                                                                                          |
| claude-code | settings                   | `.claude/settings.json`, `.claude/settings.local.json`                                                        | `~/.claude/settings.json` (and `~/.claude.json`, app-written)                                               |
| claude-code | skills                     | `.claude/skills/<name>/SKILL.md`                                                                              | `~/.claude/skills/<name>/SKILL.md`                                                                          |
| claude-code | commands (legacy)          | `.claude/commands/**/*.md`                                                                                    | `~/.claude/commands/` (implied, not stated explicitly)                                                      |
| claude-code | subagents                  | `.claude/agents/*.md`                                                                                         | `~/.claude/agents/*.md`                                                                                     |
| claude-code | hooks                      | `hooks` key in `.claude/settings.json` / `.claude/settings.local.json`                                        | `hooks` key in `~/.claude/settings.json`                                                                    |
| claude-code | MCP                        | `.mcp.json` (project scope)                                                                                   | `~/.claude.json` (user scope; local scope is per-project entries in the same file)                          |
| codex       | instructions               | `AGENTS.md` / `AGENTS.override.md` per directory                                                              | `~/.codex/AGENTS.md` / `AGENTS.override.md` (or `$CODEX_HOME`)                                              |
| codex       | config (incl. MCP, hooks)  | `.codex/config.toml` (trusted projects only)                                                                  | `~/.codex/config.toml`                                                                                      |
| codex       | skills                     | `.agents/skills/<name>/SKILL.md`                                                                              | `~/.agents/skills/<name>/SKILL.md`                                                                          |
| codex       | hooks                      | `.codex/hooks.json` or `[hooks]` in `.codex/config.toml`                                                      | `~/.codex/hooks.json` or `[hooks]` in `~/.codex/config.toml`                                                |
| codex       | custom prompts (deprecated)| none documented                                                                                               | `~/.codex/prompts/*.md`                                                                                     |
| codex       | subagents                  | `.codex/agents/*.toml`                                                                                        | `~/.codex/agents/*.toml`                                                                                    |
| copilot     | instructions               | `.github/copilot-instructions.md`; `.github/instructions/**/*.instructions.md`; `AGENTS.md`; root `CLAUDE.md`/`GEMINI.md` | `~/.copilot/copilot-instructions.md`; `~/.copilot/instructions/**/*.instructions.md` (CLI); VS Code profile |
| copilot     | MCP                        | `.mcp.json`, `.github/mcp.json` (CLI); `.vscode/mcp.json` (VS Code); cloud agent: repo settings UI, not a file | `~/.copilot/mcp-config.json` (CLI); VS Code user-profile `mcp.json`                                         |
| copilot     | skills                     | `.github/skills`, `.claude/skills`, `.agents/skills`                                                          | `~/.copilot/skills`, `~/.agents/skills`                                                                     |
| copilot     | hooks                      | `.github/hooks/*.json`; `hooks` in `.github/copilot/settings(.local).json` or `.claude/settings(.local).json` | `~/.copilot/hooks/*.json`; `hooks` in `~/.copilot/settings.json`                                            |
| copilot     | prompt files               | `.github/prompts/*.prompt.md` (VS Code)                                                                       | VS Code user-profile folder                                                                                 |
| copilot     | custom agents              | `.github/agents/<name>.agent.md`                                                                              | org/enterprise repos only on the page fetched                                                               |
| cursor      | rules                      | `.cursor/rules/**/*.mdc`; `AGENTS.md` (nested ok)                                                             | none as a file: User Rules live in Cursor settings UI **(weak)**                                            |
| cursor      | MCP                        | `.cursor/mcp.json`                                                                                            | `~/.cursor/mcp.json`                                                                                        |
| cursor      | hooks                      | `.cursor/hooks.json`                                                                                          | `~/.cursor/hooks.json`                                                                                      |
| cursor      | skills                     | `.cursor/skills/`, `.agents/skills/` (also reads `.claude/skills/`, `.codex/skills/`)                         | `~/.cursor/skills/`, `~/.agents/skills/` (also `~/.claude/skills/`, `~/.codex/skills/`)                     |
| cursor      | subagents                  | `.cursor/agents/` (also `.claude/agents/`, `.codex/agents/`)                                                  | `~/.cursor/agents/` (also `~/.claude/agents/`, `~/.codex/agents/`)                                          |
| cursor      | commands                   | n/d on current docs pages (only "user-level and workspace-level" mentioned)                                   | n/d                                                                                                         |
| cursor      | ignore                     | `.cursorignore` (root)                                                                                        | global ignore patterns in user settings UI                                                                  |
| gemini      | instructions               | `GEMINI.md` (workspace dirs, parents, and JIT subdirs); names configurable via `context.fileName`             | `~/.gemini/GEMINI.md`                                                                                       |
| gemini      | settings (incl. MCP, hooks)| `.gemini/settings.json`                                                                                       | `~/.gemini/settings.json`                                                                                   |
| gemini      | commands                   | `<project>/.gemini/commands/**/*.toml`                                                                        | `~/.gemini/commands/**/*.toml`                                                                              |
| gemini      | skills                     | `.gemini/skills/`, `.agents/skills/`                                                                          | `~/.gemini/skills/`, `~/.agents/skills/`                                                                    |
| gemini      | policies                   | `.gemini/policies/*.toml` (documented as currently disabled)                                                  | `~/.gemini/policies/*.toml`                                                                                 |
| opencode    | instructions               | `AGENTS.md` (falls back to `CLAUDE.md`)                                                                       | `~/.config/opencode/AGENTS.md` (falls back to `~/.claude/CLAUDE.md`)                                        |
| opencode    | config (incl. MCP)         | `opencode.json` (project root)                                                                                | `~/.config/opencode/opencode.json`                                                                          |
| opencode    | commands                   | `.opencode/commands/*.md` or `command` key in config                                                          | `~/.config/opencode/commands/`                                                                              |
| opencode    | skills                     | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/`                                                     | `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`                                      |
| opencode    | subagents                  | `.opencode/agents/*.md`                                                                                       | `~/.config/opencode/agents/*.md`                                                                            |
| opencode    | plugins (its hook system)  | `.opencode/plugins/`                                                                                          | `~/.config/opencode/plugins/`                                                                               |

## Claude Code

**Instructions and rules.** User: `~/.claude/CLAUDE.md`. Project: `./CLAUDE.md` or `./.claude/CLAUDE.md`. Local: `./CLAUDE.local.md` (gitignored, personal). `AGENTS.md` is read only when no `CLAUDE.md`/`CLAUDE.local.md` exists in or above the working directory; otherwise only the CLAUDE files load. Modular rules live in `.claude/rules/**/*.md` (project) and `~/.claude/rules/` (user). All discovered files are concatenated, ordered from filesystem root down to the working directory, not overridden. `CLAUDE.md` supports `@path` imports, relative or absolute ([memory docs](https://code.claude.com/docs/en/memory)). Managed policy paths exist per OS (macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`, Linux `/etc/claude-code/CLAUDE.md`, Windows `C:\Program Files\ClaudeCode\CLAUDE.md`) (same page).

**Settings.** Precedence, highest first: managed, `--settings` flag, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`. On Windows `~/.claude` is `%USERPROFILE%\.claude`; `CLAUDE_CONFIG_DIR` relocates the home-directory files. `~/.claude.json` is a separate file Claude Code writes itself (sign-in, MCP servers, per-project state). List-valued keys merge across scopes rather than override; permissions `allow` rules merge ([settings docs](https://code.claude.com/docs/en/settings)).

**Skills and commands.** Skills: `~/.claude/skills/<name>/SKILL.md` (personal), `.claude/skills/<name>/SKILL.md` (project), nested `<subdir>/.claude/skills/`. Each skill is a directory (supporting `scripts/`, `reference.md` allowed). Legacy `.claude/commands/**/*.md` still works and accepts the same frontmatter minus `name`/`paths`; docs recommend skills. Same-name precedence: enterprise > personal > project; a skill beats a command of the same name ([skills docs](https://code.claude.com/docs/en/skills)). The skills page does not state `~/.claude/commands/` explicitly (it is only implied by the name-conflict notes).

**Subagents.** `.claude/agents/` (project, walked up to repo root) and `~/.claude/agents/` (user). Priority: managed > `--agents` flag > project > user > plugin ([sub-agents docs](https://code.claude.com/docs/en/sub-agents)).

**Hooks.** No hooks directory. Hooks are a `hooks` key in `~/.claude/settings.json`, `.claude/settings.json`, or `.claude/settings.local.json`; entries from all levels add up (do not replace), and identical handlers dedupe. Script files can live anywhere; the docs' portable form is `${CLAUDE_PROJECT_DIR}/.claude/hooks/check-style.sh`, and a literal absolute path is also accepted ([hooks docs](https://code.claude.com/docs/en/hooks)).

**MCP.** Three scopes: local (default; stored in `~/.claude.json` under the project's absolute path), project (`.mcp.json` in repo root, shareable), user (`~/.claude.json`). Precedence local > project > user > plugin > claude.ai connectors; the whole entry comes from one source, fields are not merged. `.mcp.json` supports `${VAR}` and `${VAR:-default}` in `command`, `args`, `env`, `url`, `headers` ([MCP docs](https://code.claude.com/docs/en/mcp)).

**Machine-specific values.** Local-scope MCP entries are keyed by absolute project path in `~/.claude.json` (MCP docs above). Hook commands and MCP `command` values may be literal absolute paths. `${CLAUDE_PROJECT_DIR}` is set only in the hook/server environment, so in `.mcp.json` it needs a default (`${CLAUDE_PROJECT_DIR:-.}/bin/server`) (MCP docs). `settings.local.json` and `CLAUDE.local.md` are explicitly personal and not meant to be committed.

## Codex

**Source caveat.** The `openai/codex` repo's `docs/` files for AGENTS.md, skills, and slash commands are one-line stubs pointing at `developers.openai.com` ([docs/agents_md.md](https://github.com/openai/codex/blob/main/docs/agents_md.md), [docs/skills.md](https://github.com/openai/codex/blob/main/docs/skills.md)). Fetching `developers.openai.com/codex/...` returned 308 redirects to `learn.chatgpt.com/docs/...` (server-supplied; I followed them but did not independently confirm that host is OpenAI's). Everything in this section is cited to those redirected pages **(weak: single-source, host unverified)**. Treat as needing a re-check against the Codex source (`codex-rs`) before relying on it.

**Config.** User `~/.codex/config.toml`; project `.codex/config.toml` (subfolders allowed); profiles `~/.codex/<name>.config.toml`; system `/etc/codex/config.toml`. Precedence, highest first: CLI flags, project config (root down to cwd, closest wins), profile, user, cloud-managed defaults, system, built-ins. Project `.codex/` layers (config, hooks, rules) load only if the project is trusted ([config-basic](https://learn.chatgpt.com/docs/config-file/config-basic)).

**Instructions.** Global: `~/.codex/AGENTS.override.md` else `~/.codex/AGENTS.md` (`$CODEX_HOME` if set); first non-empty file wins. Project: walk from project root to cwd; per directory, `AGENTS.override.md`, then `AGENTS.md`, then `project_doc_fallback_filenames`; one file per directory; concatenated root-down so deeper files come later; capped at `project_doc_max_bytes` (32 KiB default) ([agents-md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)).

**Skills.** Repo: `.agents/skills` (cwd, parent, and repo root); user `$HOME/.agents/skills`; admin `/etc/codex/skills`. `~/.codex/skills` is not listed as a location. No precedence between locations is documented; same-name skills are not merged ([build-skills](https://learn.chatgpt.com/docs/build-skills)). Note Cursor does read `.codex/skills/` and `~/.codex/skills/` ([Cursor skills](https://cursor.com/docs/context/skills)), so that path may exist historically; Codex's own page does not list it.

**Hooks.** `~/.codex/hooks.json`, `~/.codex/config.toml` `[hooks]`, `<repo>/.codex/hooks.json`, `<repo>/.codex/config.toml`. Hooks from all layers load (no replacement). Non-managed hooks must be reviewed/trusted via `/hooks`, keyed to a hash of the hook ([hooks](https://learn.chatgpt.com/docs/hooks)). Repo-local hook commands should resolve via `$(git rev-parse --show-toplevel)` rather than relative paths (same page).

**MCP.** `[mcp_servers.<name>]` tables in `~/.codex/config.toml` or `.codex/config.toml` (trusted projects only). stdio fields: `command`, `args`, `env`, `env_vars`, `cwd` ([mcp](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)).

**Custom prompts.** `~/.codex/prompts/*.md` (top-level only), deprecated in favour of skills; no project-level location ([custom-prompts](https://learn.chatgpt.com/docs/custom-prompts)).

**Subagents.** `~/.codex/agents/` and `.codex/agents/`, one TOML file per agent with required `name`, `description`, `developer_instructions`; same-name resolution across the two dirs not documented ([subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)).

**Machine-specific values.** MCP `command`/`cwd` and hook commands are free-form strings; managed hooks are told to use absolute paths. `env_vars` forwards variables from the local environment, so copied configs depend on those being set.

## GitHub Copilot

Copilot is several surfaces (github.com chat, cloud agent, code review, CLI, VS Code), and they read different files. The table above merges them; per surface:

**Instructions.** Repository: `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md` (frontmatter `applyTo` glob), `AGENTS.md` anywhere (nearest wins), `CLAUDE.md`/`GEMINI.md` at repo root only ([repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)). Personal on github.com: set in the web UI, not a file ([personal instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-personal-instructions)). CLI user-level: `$HOME/.copilot/copilot-instructions.md` and `$HOME/.copilot/instructions/**/*.instructions.md`, relocated by `COPILOT_HOME`; also reads `.claude/CLAUDE.md`; extra dirs via `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` ([CLI instructions](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)). VS Code additionally reads `~/.claude/CLAUDE.md`, `~/.claude/rules`, `.claude/rules`, `CLAUDE.local.md`, and a profile-stored user instructions folder ([VS Code custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)). Precedence: personal > repository > organization, but all relevant sets are sent, not just the winner ([repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)).

**MCP.** CLI: user `~/.copilot/mcp-config.json`; repo `.mcp.json` (each dir from cwd up to repo root) and `.github/mcp.json`; `.mcp.json` wins within a directory; closer file wins; project overrides user; project servers skipped in untrusted folders; `.vscode/mcp.json` is not read by the CLI ([CLI MCP](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)). VS Code: `.vscode/mcp.json` (top-level `servers`, with `${input:...}`), root `.mcp.json` (`mcpServers`, called the preferred shared location), user-profile `mcp.json`; OS-specific user-profile path not given on the page ([VS Code MCP](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)). Cloud agent: JSON pasted into repository Settings > Copilot > MCP servers on github.com, not a repo file ([cloud agent MCP](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/extend-cloud-agent-with-mcp)).

**Skills.** Project `.github/skills`, `.claude/skills`, `.agents/skills`; personal `~/.copilot/skills`, `~/.agents/skills`; precedence not documented ([CLI skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-skills)).

**Hooks.** CLI loads `.github/hooks/*.json` (repo), `~/.copilot/hooks/*.json` (user, `$COPILOT_HOME/hooks/`), inline `hooks` in `.github/copilot/settings.json`/`settings.local.json`, `.claude/settings.json`/`settings.local.json`, and `~/.copilot/settings.json`; all matching entries run. Cloud agent loads only `.github/hooks/*.json`. File format needs `"version": 1` ([hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)).

**Other.** Custom agents: `.github/agents/<name>.agent.md` (repo), `agents/<name>.agent.md` in the org `.github`/`.github-private` repo; `~/.copilot/agents` not mentioned on that page ([custom agents](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents)). Prompt files: `.github/prompts/*.prompt.md` workspace, profile folder for user (VS Code docs; OS path not stated) ([prompt files](https://code.visualstudio.com/docs/copilot/customization/prompt-files)). Cloud agent environment: `.github/workflows/copilot-setup-steps.yml` ([environment](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment)).

**Machine-specific values.** Cloud agent runs with `HOME=/root` and workspace `/workspace`, so `~` paths in hooks do not persist ([hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)). VS Code MCP: a path valid in one environment may not exist in a remote one (the page's note, flagged there as inference). VS Code user settings sync does not cover `~/.copilot/instructions` or `~/.claude/rules` ([VS Code custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)).

## Cursor

**Rules.** Project: `.cursor/rules/` (folders allowed), `.mdc` files with frontmatter (`description`, `globs`, `alwaysApply`); `AGENTS.md` at root and nested. User Rules are managed in Cursor settings (Customize > Rules), not described as files on disk; Team Rules come from the dashboard. Precedence: Team > Project > User, merged. The page I fetched says `.md` files in `.cursor/rules` are ignored because they have no frontmatter (summarizer wording; treat as **weak**) and does not mention `.cursorrules` at all ([Cursor rules](https://cursor.com/docs/context/rules)).

**MCP.** `.cursor/mcp.json` (project) and `~/.cursor/mcp.json` (global); merge/precedence between them not documented. Interpolation in `command`, `args`, `env`, `url`, `headers`: `${env:NAME}`, `${workspaceFolder}`, `${userHome}`, `${workspaceFolderBasename}` ([Cursor MCP](https://cursor.com/docs/context/mcp)).

**Hooks.** `.cursor/hooks.json` (project), `~/.cursor/hooks.json` (user), plus enterprise (macOS `/Library/Application Support/Cursor/hooks.json`, Linux `/etc/cursor/hooks.json`, Windows `C:\ProgramData\Cursor\hooks.json`) and dashboard-synced team hooks. Priority enterprise > team > project > user; all matching hooks run. Relative commands resolve from the project root for project hooks (`.cursor/hooks/script.sh`) and from `~/.cursor/` for user hooks (`./hooks/script.sh`) ([Cursor hooks](https://cursor.com/docs/hooks)).

**Skills and subagents.** Skills: `.agents/skills/`, `.cursor/skills/`, `~/.agents/skills/`, `~/.cursor/skills/`, and also `.claude/skills/`, `.codex/skills/`, `~/.claude/skills/`, `~/.codex/skills/`; `SKILL.md` in a folder, `name` must match folder ([Cursor skills](https://cursor.com/docs/context/skills)). Subagents: `.cursor/agents/`, `.claude/agents/`, `.codex/agents/` (project) and the `~/` equivalents; project beats user, `.cursor/` beats `.claude/`/`.codex/` ([Cursor subagents](https://cursor.com/docs/context/subagents)).

**Commands.** The Cursor pages I fetched (`/docs/agent/chat/commands`, `/docs/context/commands`) did not document `.cursor/commands` or `~/.cursor/commands`; they only mention "user-level and workspace-level" slash commands and `/migrate-to-skills` (Cursor 2.4+). The registry's `.cursor/commands/**/*.md` is therefore unconfirmed by current docs.

**Ignore.** `.cursorignore` in project root, optionally searched in parents ("Hierarchical Cursor Ignore" setting); global ignore patterns are a user-settings list. `.cursorindexingignore` is not mentioned on the page ([ignore files](https://cursor.com/docs/context/ignore-files)).

**Machine-specific values.** MCP `command` must be on PATH or a full path; `${workspaceFolder}`/`${userHome}` avoid hardcoding (MCP docs above). Hook `command` may be an absolute path (hooks docs above).

## Gemini CLI

**Notice.** The Gemini CLI pages state it "was replaced by Antigravity CLI on June 18, 2026" for unpaid-tier and Google One users ([GEMINI.md docs](https://geminicli.com/docs/cli/gemini-md/), [MCP docs](https://geminicli.com/docs/tools/mcp-server/)). I did not investigate Antigravity's config locations; everything below describes Gemini CLI as documented.

**Settings.** User `~/.gemini/settings.json` (relocatable via `GEMINI_CLI_HOME`); project `.gemini/settings.json`; system defaults and system overrides per OS (e.g. `/etc/gemini-cli/`, `/Library/Application Support/GeminiCli/`, `C:\ProgramData\gemini-cli\`). Precedence low to high: defaults, system defaults, user, project, system overrides, env vars (including `.env`), CLI args. Deep-merge semantics for nested objects are not documented on that page. Settings strings support `$VAR`, `${VAR}`, `${VAR:-default}`. `.env` search: cwd, then parents up to the git root or home, then `~/.env` ([configuration](https://geminicli.com/docs/reference/configuration)). Hooks and `mcpServers` are keys in this same `settings.json`; hook precedence is project > user > system > extensions ([hooks](https://geminicli.com/docs/hooks/)); the MCP page does not say how user and project `mcpServers` combine ([MCP](https://geminicli.com/docs/tools/mcp-server/)).

**Instructions.** `~/.gemini/GEMINI.md` (global), then `GEMINI.md` in workspace dirs and their parents, then just-in-time scanning of directories tools touch; all concatenated. `context.fileName` can list alternative names such as `AGENTS.md` ([GEMINI.md docs](https://geminicli.com/docs/cli/gemini-md/)).

**Commands.** `~/.gemini/commands/` and `<project>/.gemini/commands/`, `.toml` files with required `prompt`; subdirectories namespace (`git/commit.toml` becomes `/git:commit`); project overrides user on name clash ([custom commands](https://geminicli.com/docs/cli/custom-commands/)).

**Skills.** `~/.gemini/skills/` or `~/.agents/skills/` (user); `.gemini/skills/` or `.agents/skills/` (workspace). Precedence: workspace > user > extension > built-in; `.agents/skills` beats `.gemini/skills` within a tier ([skills](https://geminicli.com/docs/cli/skills/)).

**Policies.** `~/.gemini/policies/*.toml` (user tier) and admin dirs. The workspace tier `$WORKSPACE_ROOT/.gemini/policies/*.toml` is documented as "Currently disabled. Policies here have no effect (see issue #18186)" ([policy engine](https://geminicli.com/docs/reference/policy-engine/)). The page has an internal inconsistency in tier base numbers.

**Machine-specific values.** Hook example uses `$GEMINI_PROJECT_DIR/.gemini/hooks/security.sh` (absolute path to project root; `CLAUDE_PROJECT_DIR` aliased); project hooks are fingerprinted by name+command, so changed hooks are treated as untrusted ([hooks](https://geminicli.com/docs/hooks/)). MCP `cwd`/`args` relative-path base is not stated; stdio servers in untrusted folders show Disconnected until `gemini trust` ([MCP](https://geminicli.com/docs/tools/mcp-server/)).

## OpenCode

**Config.** Global `~/.config/opencode/opencode.json` (plus `tui.json`); project `opencode.json` at root (searched up to nearest git dir); `.opencode/` directories hold `agents/`, `commands/`, `modes/`, `plugins/`, `skills/`, `tools/`, `themes/` (singular names still accepted). Configs merge (later wins on conflicting keys), low to high: remote `.well-known/opencode`, global, `OPENCODE_CONFIG`, project, `.opencode` dirs, `OPENCODE_CONFIG_CONTENT`, managed files, macOS MDM. The page does not mention XDG variables. Substitution: `{env:NAME}` and `{file:path}` (relative to the config file, or absolute starting `/` or `~`) ([config](https://opencode.ai/docs/config/)).

**Instructions.** Project `AGENTS.md` (falls back to `CLAUDE.md` only if no `AGENTS.md`); global `~/.config/opencode/AGENTS.md` (falls back to `~/.claude/CLAUDE.md`). `OPENCODE_DISABLE_CLAUDE_CODE=1` disables all `.claude` support. An `instructions` array in `opencode.json` accepts paths, globs (example `.cursor/rules/*.md`), and URLs ([rules](https://opencode.ai/docs/rules/)).

**Commands / agents.** `.opencode/commands/*.md` and `~/.config/opencode/commands/`; `.opencode/agents/*.md` and `~/.config/opencode/agents/`; commands can alternatively be defined under the `command` key in config ([commands](https://opencode.ai/docs/commands/), [agents](https://opencode.ai/docs/agents/)).

**Skills.** `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` (project, searched up to the git worktree) and `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/`; precedence not defined, docs say keep names unique ([skills](https://opencode.ai/docs/skills/)).

**MCP / hooks.** MCP servers are the `mcp` key in `opencode.json` (`type: local` with `command` array, or `remote` with `url`) ([MCP servers](https://opencode.ai/docs/mcp-servers/)). OpenCode's hook mechanism is plugins: `.opencode/plugins/`, `~/.config/opencode/plugins/`, or npm packages in the `plugin` array ([plugins](https://opencode.ai/docs/plugins/)). OAuth tokens for MCP are stored in `~/.local/share/opencode/mcp-auth.json` (MCP page).

**Machine-specific values.** `{file:~/...}` and local MCP `command`/`cwd` can embed machine paths; env-based secrets via `{env:...}`.

## Registry discrepancies

Registry facts cite `packages/agents-registry/src/index.ts`.

**Types.** `ComponentType` is only `instruction | command | skill | mcp_server | hook` (`:10`). There is no type for settings, rules, or subagents, so these files are all forced into `instruction` or omitted.

**claude-code (`:108-127`)**
- `.claude/settings.json` typed `instruction` (`:110`, `:117`): it is the settings file and also the hooks location, so it carries `hook` content too.
- `.claude/hooks/**/*` typed `hook` (`:112`, `:120`): Claude Code has no hooks directory; hooks are registered in `settings.json` (docs above). Scripts under `.claude/hooks/` are only referenced by convention.
- `.claude/skills/**/*.md` (`:113`, `:121`): skills are `<name>/SKILL.md` plus supporting `scripts/` and other files; the `*.md` glob misses non-markdown supporting files.
- Missing: `.claude/CLAUDE.md` (project), `CLAUDE.local.md`, `.claude/settings.local.json`, `.claude/rules/**`, `.claude/agents/**`, `~/.claude/rules/`, `~/.claude/agents/`, `~/.claude.json` for user-scope MCP. Global has no `.mcp.json` entry; user MCP lives in `~/.claude.json` (`:116-122`).

**codex (`:137-147`)**
- `.codex/config.toml` typed `instruction` (`:139`, `:142`): it is a general config file holding model settings, `mcp_servers`, and `[hooks]`, not instructions.
- `.codex/agents/**/*.toml` typed `instruction` (`:140`): these are subagent definitions with `developer_instructions`; no subagent type exists.
- Missing: `~/.codex/AGENTS.md` and `AGENTS.override.md` (global instructions), `.codex/hooks.json`, `~/.codex/hooks.json`, `~/.codex/prompts/`, `~/.codex/agents/`, and skills at `.agents/skills`/`~/.agents/skills` (only present as `SHARED_GLOBS`, `:261-263`, project-only, and `.md`-only).
- `.agents/skills` note: the registry comment attributes `.agents/skills` to Vercel's skills.sh and says it must not be credited to Codex (`:253-259`), but Codex, Cursor, Copilot, Gemini, and OpenCode docs each list `.agents/skills` as a first-class location (links in per-agent sections). No global equivalent (`~/.agents/skills`) is in `SHARED_GLOBS`.

**copilot (`:157-172`)**
- `.github/copilot/instructions.md`, `.github/copilot/mcp.json`, `.github/copilot/agents.json`, `.github/copilot/firewall.json`, `.github/copilot/setup.sh`, `.github/copilot/prompts/**/*.md` (`:159-164`): none of these paths appeared in the docs I fetched. Documented equivalents are `.github/instructions/**/*.instructions.md`, `.mcp.json` / `.github/mcp.json` / `.vscode/mcp.json`, `.github/agents/*.agent.md`, `.github/prompts/*.prompt.md`, `.github/hooks/*.json`, `.github/workflows/copilot-setup-steps.yml`. Cloud-agent MCP and firewall config are repo-settings UI, not files. I could not confirm the `.github/copilot/*` names exist anywhere; `.github/copilot/settings.json` and `settings.local.json` are the only `.github/copilot/` files documented (CLI hooks, [hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)).
- `.vscode/settings.json` typed `instruction` (`:165`): VS Code settings can hold Copilot instruction settings, but `chat.instructionsFilesLocations` is deprecated and code-generation instruction settings are deprecated since VS Code 1.102 ([VS Code custom instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)). The file is not Copilot-owned.
- `globalGlobs: []` and `scopes: ['project']` (`:167`, `:172`): Copilot CLI and VS Code have global locations (`~/.copilot/copilot-instructions.md`, `~/.copilot/instructions/`, `~/.copilot/mcp-config.json`, `~/.copilot/skills`, `~/.copilot/hooks/`, `~/.copilot/settings.json`).
- `detection.homePaths: []` (`:169`): `~/.copilot` is the CLI's home (relocatable via `COPILOT_HOME`).
- Missing: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` as Copilot-read instruction files (but registry gives first-match to codex/claude/gemini via `getAgentForFile`, `:273-283`).

**cursor (`:182-201`)**
- `.cursorrules` (`:183`): not mentioned on the current rules page (legacy status undetermined from that page).
- `.cursor/rules/**/*.md` typed `instruction` (`:187`): the fetched rules page says `.md` in `.cursor/rules` is ignored (weak, see above); `.mdc` is the documented format.
- `.cursor/commands/**/*.md` (`:190`): not confirmed on current docs (see Cursor section).
- `.cursor/skills/**/*.md` (`:191`): documented location is `<name>/SKILL.md`.
- `.cursorindexingignore` (`:185`): not documented on the ignore-files page.
- Global (`:193-196`): `.cursor/rules/**/*.mdc` and `.cursor/settings.json` are not documented as global files. User Rules are in the settings UI. Documented global files are `~/.cursor/mcp.json`, `~/.cursor/hooks.json`, `~/.cursor/skills/`, `~/.cursor/agents/`, none of which are in `globalGlobs`.
- Missing: `AGENTS.md` for Cursor, `.cursor/agents/`, `.agents/skills/`.

**gemini (`:211-224`)**
- `.gemini/settings.json` typed `instruction` (`:214`, `:219`): it is the general settings file and also holds `mcpServers` and `hooks`.
- `.gemini/policies/**/*.toml` (`:217`): matches the docs' path, but the docs say workspace policies are currently disabled; the working location is `~/.gemini/policies/*.toml`, absent from `globalGlobs`.
- `.gemini/skills/**/*.md` (`:216`): skills are `<name>/SKILL.md`; `.agents/skills` also valid.
- Missing global: `~/.gemini/GEMINI.md`, `~/.gemini/commands/**/*.toml`, `~/.gemini/skills/`, `~/.gemini/policies/` (`:219` has only settings.json).
- `.geminiignore` (`:213`): format not documented on the page; the `context.fileFiltering.respectGeminiIgnore` setting references it.

**opencode (`:234-244`)**
- `opencode.md` (`:235`) and `.opencode.json` (`:236`) are the file names of the archived Go project `opencode-ai/opencode`, which is marked "Archived: Project has Moved" and lists `./.opencode.json`, `$HOME/.opencode.json`, `$XDG_CONFIG_HOME/opencode/.opencode.json`, and an `OpenCode.md` memory file ([opencode-ai/opencode README](https://github.com/opencode-ai/opencode)). The current docs name `opencode.json` and `AGENTS.md` (links above). Mapping is stale for current OpenCode.
- Global `.config/opencode/config.json` (`:239`) does not match the documented `~/.config/opencode/opencode.json`.
- `.opencode/commands/**/*.md` (`:237`) is correct.
- Missing: `opencode.json` (project), `AGENTS.md`, `~/.config/opencode/AGENTS.md`, `.opencode/agents/`, `.opencode/skills/`, `.opencode/plugins/`, and global `commands/`, `agents/`, `skills/`, `plugins/` dirs. The `mcp` block lives inside `opencode.json`, so MCP is not a separate file.
- `detection.homePaths: ['.config/opencode']` (`:241`) matches the documented global dir.

**Cross-cutting.** `getAgentForFile` returns the first agent in registry order whose glob matches (`:273-283`), so `AGENTS.md` is attributed to codex even though Copilot, Cursor, Gemini (via `context.fileName`), OpenCode, and Claude Code (fallback) also read it. Several agents read other agents' locations: Copilot reads `CLAUDE.md`, `GEMINI.md`, `.claude/skills`; Cursor reads `.claude/` and `.codex/` skills and agents; OpenCode reads `CLAUDE.md` and `.claude/skills`.

## Implications for Local copy location

Facts only.

- Every agent has both a project and a global location for instructions, skills, and (except Cursor commands, Copilot prompts/agents) commands/agents.
- Settings, MCP, and hooks are not separate files for most agents: Claude Code hooks live in `settings.json`; Codex hooks and MCP live in `config.toml` (or `hooks.json`); Gemini hooks and MCP live in `settings.json`; OpenCode MCP lives in `opencode.json`. A single file therefore mixes portable content with machine-specific content, and installing it into the global file means merging into a file the user already owns.
- Claude Code's user-scope MCP and local-scope MCP both live in `~/.claude.json`, a file the app writes itself; project-scope MCP is `.mcp.json` in the repo.
- Cursor has no documented file for global rules (User Rules are in the settings UI), so a global Cursor instructions Setup has no file target on the pages fetched.
- Copilot has no global MCP/instruction path for the cloud agent or code review (repo files or repo settings only); global paths exist only for the CLI (`~/.copilot/`) and VS Code.
- Project-scope config needing trust: Codex `.codex/` layers load only in trusted projects; Copilot CLI project MCP skipped in untrusted folders; Gemini project hooks are fingerprinted and project stdio MCP needs `gemini trust`; Claude Code project MCP needs approval and the `headersHelper` runs only after trust.
- Project beats global (or merges) for settings in Claude Code, Codex, Gemini, OpenCode; Claude Code skills are the exception (personal beats project); Cursor rules order is Team > Project > User; Cursor hooks priority is Project > User; Copilot says personal > repository > organization but sends all.
- Instructions are concatenated, not overridden, in Claude Code, Codex, Gemini, and Copilot; OpenCode picks the first match per category (local `AGENTS.md`, then global).
- A shared skills directory (`.agents/skills`, `~/.agents/skills`) is read by Codex, Copilot, Cursor, Gemini, and OpenCode; Claude Code's documented skills locations are `.claude/skills` and `~/.claude/skills` only (the skills page I fetched lists no `.agents/skills`).
- `AGENTS.md` is read natively by Codex, Copilot, Cursor, OpenCode, and as a fallback by Claude Code; Gemini reads it only if `context.fileName` is configured.
- Content that embeds machine-specific values: MCP `command`/`args`/`cwd`/`env` (all agents); hook commands (Claude Code, Codex, Copilot, Cursor, Gemini); Claude Code local-scope MCP keyed by absolute project path; Claude Code `CLAUDE.md` `@path` imports can be absolute; OpenCode `{file:~/...}`; Codex `env_vars` and Copilot/Cursor `${env:...}`/`{env:...}` reference local env vars. Portable placeholders exist: Claude `${CLAUDE_PROJECT_DIR}`, Cursor `${workspaceFolder}`/`${userHome}`, Gemini `$GEMINI_PROJECT_DIR`, Codex `$(git rev-parse --show-toplevel)` (docs-recommended pattern).
- Home-directory relocation env vars: `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `COPILOT_HOME`, `GEMINI_CLI_HOME`, `OPENCODE_CONFIG_DIR`/`OPENCODE_CONFIG`. OpenCode's global dir is `~/.config/opencode` per its docs, which do not mention `XDG_CONFIG_HOME`. Cursor has no documented override.
- Windows: Claude Code `~/.claude` is `%USERPROFILE%\.claude`; Copilot CLI `%USERPROFILE%\.copilot`; Gemini `~/.gemini` on all OSes per its table; other agents' Windows paths for user config were not stated on the pages fetched.
- Registry state: Copilot is `scopes: ['project']` only (`:172`), and several mapped paths (Copilot `.github/copilot/*`, OpenCode `opencode.md`/`.opencode.json`/`config.json`, Cursor global files) are not confirmed by current docs (see Registry discrepancies).
