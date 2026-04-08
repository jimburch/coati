# Ralph — Autonomous AI Worker System

## Overview

Ralph is an autonomous dispatcher/worker system that processes GitHub Issues using Claude Code agents running in GitHub Actions. It follows Matt Pocock's dispatcher/worker architecture from his [course-video-manager](https://github.com/mattpocock/course-video-manager) project.

**Flow:** You create issues (manually or via Claude Code skills during work sessions) → label them `ralph` → run `pnpm dispatch` → dispatcher (Sonnet) reads issues, builds dependency graph, orders by priority → dispatches a single GitHub Actions workflow → worker (Opus) processes tasks sequentially on a `ralph` branch → each task is committed, pushed, and the issue closed → after all tasks complete, `ralph` merges into `develop` → you review `develop` and merge into `main`.

## Architecture

```
You (local)                    GitHub Actions
─────────────                  ──────────────
pnpm dispatch
  │
  ├─ Fetches open `ralph` issues (author: jimburch)
  ├─ Checks no existing ralph run is active
  │
  ├─ Calls Claude Sonnet (orchestrator)
  │   ├─ Classifies issues (AFK/HITL)
  │   ├─ Builds dependency graph (Blocked by)
  │   └─ Outputs ordered task queue JSON
  │
  └─ Dispatches single workflow run ──────►  Worker job starts
                                              ├─ Checks out develop
                                              ├─ Creates ralph branch from develop
                                              │
                                              ├─ FOR EACH TASK (sequential):
                                              │   ├─ Fetches issue context via gh
                                              │   ├─ RETRY LOOP (max 3 attempts, 10min each):
                                              │   │   ├─ Attempt 1: Full prompt
                                              │   │   │   ├─ Runs Claude Opus
                                              │   │   │   │   ├─ Explores codebase
                                              │   │   │   │   ├─ Implements feature
                                              │   │   │   │   ├─ Runs quality gates internally
                                              │   │   │   │   └─ Commits with RALPH: prefix
                                              │   │   │   ├─ Script runs gates externally
                                              │   │   │   ├─ PASS → break loop
                                              │   │   │   └─ FAIL → git reset, retry
                                              │   │   ├─ Attempt 2-3: Retry prompt
                                              │   │   │   ├─ Gate errors + git diff context
                                              │   │   │   └─ Same verify/reset cycle
                                              │   │   └─ All attempts fail → rollback, skip
                                              │   ├─ On success: push, close issue
                                              │   └─ On failure: comment, swap AFK→HITL
                                              │
                                              ├─ Closes parent PRD issues if all children done
                                              ├─ Merges ralph → develop
                                              └─ Deletes ralph branch
```

## Git Flow

```
main (production, deploys)
  ↑ merge (manual, after review)
develop (long-lived integration branch, repo default)
  ↑ merge (automatic, after all tasks complete)
ralph (ephemeral, created fresh from develop per dispatch)
```

- **`main`** — Production branch. Deploys happen from here.
- **`develop`** — Long-lived integration branch. All new work (Ralph and human) lands here. Set as the repo default branch.
- **`ralph`** — Ephemeral branch created fresh from `develop` at the start of each dispatch. Deleted after merging into `develop`.

## Decisions Made

| Decision                     | Resolution                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| Task source                  | GitHub Issues (posted by skills or manually)                                                    |
| Queue gating                 | `ralph` label + author `jimburch` required on issues                                            |
| Issue format                 | GitHub Issue with Blocked by, Acceptance criteria                                               |
| Dependencies                 | "Blocked by #N" in issue body; dispatcher checks if those issues are closed                     |
| Priority                     | Labels: `priority:high`, `priority:medium`, `priority:low`                                      |
| Issue classification         | `AFK` (autonomous) or `HITL` (needs human) as labels                                            |
| Processing model             | Sequential — one task at a time, up to 3 attempts each, ordered by dep + priority               |
| Architecture                 | Dispatcher/worker on GitHub Actions (not local loop)                                            |
| Dispatch trigger             | Manual only (`pnpm dispatch`) — never triggered by Claude                                       |
| Dispatch model               | Sonnet (reasoning/classification only)                                                          |
| Worker model                 | Opus (code generation)                                                                          |
| Worker permissions           | `--dangerously-skip-permissions` (ephemeral CI runner, safe)                                    |
| Branch strategy              | `ralph` branch from `develop`, auto-merge after all tasks, delete branch                        |
| Commit convention            | `RALPH:` prefix with description and issue reference                                            |
| Acceptance criteria tracking | Worker checks off `- [ ]` → `- [x]` in issue body incrementally as it works                     |
| Issue lifecycle              | Worker closes issue via `gh issue close` after successful commit + push                         |
| PRD auto-close               | After all tasks, script checks open `prd`-labeled issues; closes if all child issues are closed |
| Quality gates                | Worker runs internally + script verifies externally after each attempt                          |
| Retry strategy               | Up to 3 attempts per task, 10min timeout each. Retry prompt includes gate errors + git diff     |
| Failure policy               | Rollback changes, comment on issue, swap AFK→HITL label, continue to next task                  |
| Auth in CI                   | `CLAUDE_CODE_OAUTH_TOKEN` via Anthropic GitHub App                                              |
| CLAUDE.md                    | Amended git rule for worker exception; added "never dispatch" rule                              |

## Files

| File                                    | Purpose                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `scripts/dispatch.sh`                   | Local orchestrator — fetches issues, calls Sonnet, dispatches workflow           |
| `scripts/dispatch-prompt.md`            | Prompt for the Sonnet dispatcher — classification, dependency graph, ordering    |
| `scripts/worker-run.sh`                 | Worker runner — loops through tasks sequentially, commits, pushes, closes issues |
| `scripts/worker-prompt.md`              | Prompt for the Opus worker — explore, implement, quality gates, commit           |
| `.github/workflows/claude-work.yml`     | Actions workflow — creates ralph branch, runs worker, merges to develop          |
| `.github/ISSUE_TEMPLATE/ralph-task.yml` | Issue template — Description, Classification, Blocked by, Acceptance criteria    |

## Labels

- `ralph` — Issue is ready for Ralph to pick up
- `priority:high` — High priority (red)
- `priority:medium` — Medium priority (yellow)
- `priority:low` — Low priority (green)
- `AFK` — Can be implemented autonomously (blue)
- `HITL` — Requires human-in-the-loop (yellow)

## History

### v1 — Parallel branches with PRs (2026-03-22)

Original architecture: dispatcher selected parallel tasks, each worker created a `claude/*` branch, opened a PR, user reviewed and merged.

**Test runs:**

- Issue #2 (star button bug): First run failed due to repo permissions. Second run succeeded — worker completed in ~6 minutes, PR #3 merged.

### v2 — Sequential processing on ralph branch (2026-03-23)

Simplified to sequential processing: single `ralph` branch from `develop`, worker loops through tasks one at a time, auto-merges into `develop` when done. Removed PR creation — worker commits directly and closes issues.

**Motivation:** Remove PR review overhead per ticket, allow Ralph to chain through dependency graphs in one dispatch, preserve safety via `develop` → `main` merge gate.

### v3 — Retry loop with external verification (2026-03-23)

Added iteration loop per task (max 3 attempts, 10min each) inspired by Matt Pocock's `afk-ralph.sh`. Script now runs quality gates externally after each Claude invocation to verify success. Failed commits are reset (`git reset HEAD~1`). Retry prompts include gate errors + git diff context. Tasks that exhaust all attempts get rolled back, commented with failure details, and relabeled AFK→HITL. Workflow timeout bumped to 60 minutes.

## Known Issues & Things to Figure Out

### 1. Worker prompt may need iteration

The worker prompt is a living document. After reviewing actual output from real runs, we'll likely need to tune:

- How much exploration vs. implementation time the worker spends
- Whether the quality gate instructions are clear enough
- Whether the retry prompt gives enough context for successful recovery

### 2. E2E tests not in quality gates

Unit tests run before commit, but Playwright E2E tests are skipped because they need a running app + database. Options to explore:

- Add a `pnpm build` step to the worker quality gate (catches more issues)
- Set up a test database in CI for E2E (adds complexity)
- Keep E2E as a manual check during `develop` → `main` review (current approach)

### 3. Cost monitoring

No cost tracking or budget caps beyond timeouts. Each attempt is capped at 10 minutes, each task at 3 attempts, and the workflow at 60 minutes total. Consider:

- Tracking spend per issue/dispatch
- Setting up alerts for runaway workers

### 4. Stale branch cleanup

If a workflow fails mid-run, the `ralph` branch may be left behind. No automated cleanup exists.

### 5. Input validation for websiteUrl

Separate from Ralph, but noted: the profile page crashes on invalid `websiteUrl` values. Input validation at the save layer is needed (tracked separately from the try/catch fix).
