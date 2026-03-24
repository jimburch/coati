# Ralph Setup Guide

This guide walks you through setting up the skills-driven development workflow and the Ralph autonomous worker system from scratch. It assumes you have a SvelteKit project (or similar) with Claude Code as your AI coding assistant.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- GitHub repo with Actions enabled
- `gh` CLI installed and authenticated
- Node.js + pnpm

## 1. Install the Skills

The workflow relies on three Claude Code skills that chain together. Install them via the [superpowers](https://github.com/jimburch/superpowers) skill pack or individually:

### `/grill-me`

Stress-tests your ideas before you commit to building them. You describe a plan or feature concept, and Claude interviews you relentlessly — probing edge cases, questioning assumptions, exploring alternatives — until you reach shared understanding. This is optional but highly recommended before writing a PRD for anything non-trivial.

### `/write-a-prd`

Creates a Product Requirements Document through a structured interview. Claude explores your codebase, asks detailed questions, sketches the major modules, and writes a complete PRD. The output is a **GitHub issue** (labeled `prd`) — not a local file. The issue is the single source of truth.

### `/prd-to-issues`

Takes a PRD issue and breaks it into independently-grabbable implementation issues using vertical "tracer bullet" slices — each slice cuts through every layer of the stack end-to-end. Issues are created with dependency references (`Blocked by #N`), acceptance criteria, and the labels Ralph needs to pick them up.

## 2. Set Up Labels

Create these labels on your GitHub repo (Ralph uses them for classification and priority):

| Label             | Color  | Purpose                                    |
| ----------------- | ------ | ------------------------------------------ |
| `ralph`           | —      | Issue is ready for Ralph to process        |
| `prd`             | —      | Issue is a PRD (parent of implementation)  |
| `AFK`             | blue   | Can be implemented autonomously            |
| `HITL`            | yellow | Requires human-in-the-loop                 |
| `priority:high`   | red    | Processed first within dependency tier     |
| `priority:medium` | yellow | Processed second                           |
| `priority:low`    | green  | Processed last                             |

## 3. Set Up the Ralph Scripts

Ralph has four files that work together. See the actual files in this repo for the full implementation:

| File                         | What it does                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `scripts/dispatch.sh`        | Local orchestrator — fetches open `ralph` issues, calls Sonnet to build a dependency-ordered task queue, dispatches the GitHub Actions workflow |
| `scripts/dispatch-prompt.md` | Prompt for the Sonnet orchestrator — classification rules, dependency graph logic, JSON output format  |
| `scripts/worker-run.sh`      | CI worker runner — loops through tasks sequentially, invokes Opus per task, runs quality gates externally, retries up to 3 times |
| `scripts/worker-prompt.md`   | Prompt for the Opus worker — codebase exploration, implementation, internal quality gates, commit format |

Add a convenience script to `package.json`:

```json
{
  "scripts": {
    "dispatch": "./scripts/dispatch.sh"
  }
}
```

## 4. Set Up the GitHub Actions Workflow

Create `.github/workflows/claude-work.yml` — this is the workflow that `dispatch.sh` triggers. See this repo's workflow file for the full implementation. Key responsibilities:

1. Check out the `develop` branch
2. Create an ephemeral `ralph` branch
3. Run `worker-run.sh` with the task queue JSON
4. Auto-merge `ralph` → `develop` on completion
5. Delete the `ralph` branch

### Required Secrets

Add these to your repo's GitHub Actions secrets:

- **`CLAUDE_CODE_OAUTH_TOKEN`** — OAuth token for Claude Code CLI (from the [Anthropic GitHub App](https://github.com/apps/claude))

The standard `GITHUB_TOKEN` is provided automatically by Actions.

### Workflow timeout

Set to 60 minutes. Each task gets up to 3 attempts at 10 minutes each.

## 5. Set Up the Git Flow

Ralph uses a three-branch strategy:

```
main (production)
  ↑ merge (manual, after you review)
develop (integration, set as repo default)
  ↑ merge (automatic, after Ralph completes all tasks)
ralph (ephemeral, created/deleted per dispatch)
```

1. Create a `develop` branch if you don't have one
2. Set `develop` as the default branch in GitHub repo settings
3. `ralph` branches are created and deleted automatically — don't create one manually

## 6. Create an Issue Template

Create `.github/ISSUE_TEMPLATE/ralph-task.yml` so issues follow a consistent format. See this repo's template for the fields. The key sections Ralph needs are:

- **Description** — what to build
- **Classification** — AFK or HITL
- **Blocked by** — dependency references (`#N`)
- **Acceptance criteria** — checkboxes the worker checks off as it works

## 7. Configure Claude Code Permissions

Create `.claude/settings.local.json` to allow the commands Ralph needs in CI. See this repo's settings file for the full list. At minimum, allow:

- `pnpm` (check, lint, test, build)
- `gh` (issue operations)
- `node`, `npx`

## The Development Flow

Here's the full loop, end to end:

### Phase 1: Design

```
/grill-me  →  stress-test your idea until it's solid
                    ↓
/write-a-prd  →  structured interview → PRD created as GitHub issue (label: prd)
                    ↓
/prd-to-issues  →  break PRD into implementation issues with dependencies
                    (labels: ralph, AFK, priority:high)
```

Each step is a separate conversation. `/grill-me` is optional but saves time by catching design problems early.

### Phase 2: Dispatch

```bash
pnpm dispatch
```

This runs `dispatch.sh` locally, which:

1. Fetches all open issues labeled `ralph` (filtered to your GitHub username)
2. Guards against concurrent runs (checks for active `ralph` workflow)
3. Calls Sonnet to classify issues (AFK vs HITL), resolve dependencies, and sort by priority
4. Dispatches `claude-work.yml` with the ordered task queue

**Important:** Only you run dispatch. Claude never triggers it, and it should never be automated.

### Phase 3: Ralph Works

In GitHub Actions, the worker:

1. Creates a `ralph` branch from `develop`
2. Processes each task sequentially:
   - Fetches issue context via `gh`
   - Invokes Claude Opus with the worker prompt
   - Opus explores the codebase, implements the feature, runs quality gates internally, and commits
   - The script runs quality gates externally to verify (`pnpm check`, `pnpm lint`, `pnpm test:unit --run`)
   - **Pass** → push, close issue, move to next task
   - **Fail** → reset commit, retry (up to 3 attempts). If all attempts fail: comment on issue with errors, swap `AFK` → `HITL` label, skip to next task
3. After all tasks: checks if any parent PRD issues can be auto-closed (all children done)
4. Merges `ralph` → `develop`
5. Deletes `ralph` branch

### Phase 4: Review and Ship

1. Pull `develop` locally
2. Review Ralph's work — run the app, check E2E tests, eyeball the UI
3. Fix anything that needs fixing (Ralph handles most quality issues, but visual/UX review is human-only)
4. Merge `develop` → `main` when ready

Then start the loop again.

## Quality Gates

These run twice per task attempt — once inside Claude (so it can self-correct) and once externally by the script (to catch anything Claude missed):

```bash
pnpm check      # TypeScript + svelte-check
pnpm lint       # Prettier + ESLint
pnpm test:unit --run  # Vitest
```

E2E tests (Playwright) are **not** run in CI — they require a running app and database. Run them manually during the `develop` → `main` review.

## Failure Modes

| What happens                         | Ralph's response                                                        |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Quality gates fail (attempt 1 or 2)  | Reset commit, retry with error context in prompt                        |
| All 3 attempts exhausted             | Rollback, comment on issue, relabel AFK → HITL, continue to next task   |
| Blocked dependency not yet closed    | Dispatcher skips the issue (it stays in the queue for next dispatch)     |
| Workflow timeout (60 min)            | GitHub kills the job; `ralph` branch may be left behind (manual cleanup)|
| HITL issue in queue                  | Dispatcher skips it (only AFK issues are dispatched)                    |

## Tips

- **Keep issues small.** A good Ralph issue is 1-2 files of changes. Large issues burn through retry attempts.
- **Write clear acceptance criteria.** Ralph checks these off as it works — vague criteria lead to vague implementations.
- **Use dependencies.** If issue B builds on issue A's code, add `Blocked by #A` so Ralph processes them in order.
- **Review `develop` regularly.** Ralph auto-merges there, so don't let it drift too far from `main`.
- **Check Actions logs** if something looks wrong. The worker logs show exactly what Claude did and what gates said.
