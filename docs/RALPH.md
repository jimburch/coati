buu# Ralph — Autonomous AI Worker System

## Overview

Ralph is an autonomous dispatcher/worker system that processes GitHub Issues using Claude Code agents running in GitHub Actions. It follows Matt Pocock's dispatcher/worker architecture from his [course-video-manager](https://github.com/mattpocock/course-video-manager) project.

**Flow:** You create issues (manually or via Claude Code skills during work sessions) → label them `ralph` → run `pnpm dispatch` → dispatcher (Sonnet) reads issues, builds dependency graph, selects actionable tasks → dispatches parallel GitHub Actions workflows → workers (Opus) implement features on `claude/*` branches → workers open PRs → you review and merge.

## Architecture

```
You (local)                    GitHub Actions
─────────────                  ──────────────
pnpm dispatch
  │
  ├─ Fetches open `ralph` issues
  ├─ Fetches open claude/* PRs
  ├─ Fetches in-progress workflow runs
  │
  ├─ Calls Claude Sonnet (orchestrator)
  │   ├─ Classifies issues (AFK/HITL)
  │   ├─ Builds dependency graph (Blocked by)
  │   ├─ Detects file conflicts
  │   └─ Outputs task JSON
  │
  └─ For each task:
      gh workflow run claude-work.yml ──────►  Worker job starts
                                                ├─ Checks out repo
                                                ├─ Creates claude/<slug> branch
                                                ├─ Fetches issue context via gh
                                                ├─ Runs Claude Opus (--dangerously-skip-permissions)
                                                │   ├─ Explores codebase
                                                │   ├─ Implements feature
                                                │   ├─ Runs quality gates
                                                │   └─ Commits with RALPH: prefix
                                                ├─ Pushes branch
                                                └─ Opens PR (Closes #N)
```

## Decisions Made

| Decision                      | Resolution                                                                  |
| ----------------------------- | --------------------------------------------------------------------------- |
| Task source                   | GitHub Issues (posted by skills or manually)                                |
| Queue gating                  | `ralph` label required on issues                                            |
| Issue format                  | GitHub Issue Template with Classification, Blocked by, Acceptance criteria  |
| Dependencies                  | "Blocked by #N" in issue body; dispatcher checks if those issues are closed |
| Priority                      | Labels: `priority:high`, `priority:medium`, `priority:low`                  |
| Issue classification          | `AFK` (autonomous) or `HITL` (needs human) in issue body + as labels        |
| Architecture                  | Dispatcher/worker on GitHub Actions (not local loop)                        |
| Dispatch trigger              | Manual only (`pnpm dispatch`) — never triggered by Claude                   |
| Dispatch model                | Sonnet (reasoning/classification only)                                      |
| Worker model                  | Opus (code generation)                                                      |
| Worker permissions            | `--dangerously-skip-permissions` (ephemeral CI runner, safe)                |
| Branch naming                 | `claude/<short-slug>-<unix-timestamp>`                                      |
| Commit convention             | `RALPH:` prefix with description and issue reference                        |
| PR behavior                   | Opened when work is complete; `Closes #N` for auto-close on merge           |
| Quality gates (before commit) | `pnpm check`, `pnpm lint`, `pnpm test:unit --run`                           |
| Auth in CI                    | `CLAUDE_CODE_OAUTH_TOKEN` via Anthropic GitHub App                          |
| CLAUDE.md                     | Amended git rule for worker exception; added "never dispatch" rule          |

## Files Created

| File                                    | Purpose                                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `scripts/dispatch.sh`                   | Local orchestrator — fetches issues, calls Sonnet, dispatches Actions workflows                |
| `scripts/dispatch-prompt.md`            | Prompt for the Sonnet dispatcher — classification, dependency graph, conflict detection        |
| `scripts/worker-run.sh`                 | Worker script — creates branch, fetches issue context, runs Opus, commits, outputs PR metadata |
| `scripts/worker-prompt.md`              | Prompt for the Opus worker — explore, implement, quality gates, commit, PR output              |
| `.github/workflows/claude-work.yml`     | Actions workflow — triggered by dispatch, sets up env, runs worker, pushes, creates PR         |
| `.github/ISSUE_TEMPLATE/ralph-task.yml` | Issue template — Description, Classification, Blocked by, Acceptance criteria                  |

## Files Modified

| File           | Change                                                              |
| -------------- | ------------------------------------------------------------------- |
| `CLAUDE.md`    | Added Ralph worker git exception; added "never dispatch Ralph" rule |
| `package.json` | Added `"dispatch": "./scripts/dispatch.sh"` script                  |

## Labels Created

- `ralph` — Issue is ready for Ralph to pick up
- `priority:high` — High priority (red)
- `priority:medium` — Medium priority (yellow)
- `priority:low` — Low priority (green)
- `AFK` — Can be implemented autonomously (blue)
- `HITL` — Requires human-in-the-loop (yellow)

## First Test Run — Issue #2

Created issue [#2: Star button UI doesn't update until page refresh](https://github.com/jimburch/magpie/issues/2) as a test. Dispatched successfully. The worker completed its work and pushed to `claude/fix-star-button-optimistic-ui-1742342400`, but the PR creation step failed due to a repo permissions setting.

### What was fixed during the test run:

- **Repo setting**: "Allow GitHub Actions to create and approve pull requests" needed to be enabled in repo Settings > Actions
- **Push conflict**: Worker (Claude Code) pushed the branch during execution, then the explicit push step in the workflow tried to push again and got a non-fast-forward rejection. Fixed by changing to `git push --force-with-lease`.

### Still pending from test run:

- The branch `claude/fix-star-button-optimistic-ui-1742342400` exists with a commit but no PR was created. Need to either create the PR manually from the existing branch or delete the branch and re-dispatch.

## Known Issues & Things to Figure Out

### 1. ~~Worker push duplication~~ (Fixed)

Worker prompt now explicitly tells Claude not to push (workflow handles it). Push step falls back to `--force` if `--force-with-lease` fails (handles cases where Claude pushed anyway or branch exists from a previous run).

### 2. Worker prompt may need iteration

The worker prompt is a first draft. After reviewing actual PR output from real runs, we'll likely need to tune:

- How much exploration vs. implementation time the worker spends
- Whether the quality gate instructions are clear enough
- Whether the PR metadata XML tags are reliably generated
- How the worker handles failures (blocked by missing deps, unclear requirements, etc.)

### 3. Dispatch prompt tuning

The dispatcher needs real-world testing with multiple issues to validate:

- Dependency graph parsing works correctly with the issue template format
- Conflict detection between issues that touch the same files
- Priority ordering matches expectations
- Edge cases: issues with no labels, issues with partial template fields

### 4. No HITL script yet

We discussed building both HITL (`ralph-once.sh`) and AFK (`ralph.sh` / dispatch) modes. Only the dispatcher/worker (AFK) mode was built. A local HITL script for watching Ralph work on a single issue interactively was not implemented. This could be useful for:

- Debugging worker behavior
- Working on architectural/risky issues locally before promoting to AFK
- Testing prompt changes without burning CI minutes

### 5. E2E tests not in quality gates

Unit tests run before commit, but Playwright E2E tests are skipped because they need a running app + database. Options to explore:

- Add a `pnpm build` step to the worker quality gate (catches more issues)
- Set up a test database in CI for E2E (adds complexity)
- Keep E2E as a manual check during PR review (current approach)

### 6. Cost monitoring

No cost tracking or budget caps are in place. Each worker run uses Opus in CI which can be expensive. Consider:

- Adding iteration/token limits to worker runs
- Tracking spend per issue/dispatch
- Setting up alerts for runaway workers (the 30-min timeout helps but isn't a cost cap)

### 7. Notification system

No notifications when workers complete or fail. Matt Pocock uses `tt notify` for completion alerts. Options:

- GitHub Actions notifications (default, but noisy)
- Slack/Discord webhook on workflow completion
- Email summary of dispatch results

### 8. Stale branch cleanup

If workers fail or PRs are abandoned, `claude/*` branches accumulate. No automated cleanup exists. Consider:

- A scheduled workflow to delete merged/stale `claude/*` branches
- Manual cleanup as part of triage

### 9. Dispatch doesn't validate workflow exists

If `claude-work.yml` is missing or misconfigured, dispatch will fail at the `gh workflow run` step with a cryptic error. Could add a pre-flight check.

### 10. Issue template vs. skill-generated issues

The GitHub Issue Template enforces structure for manual issue creation, but skills creating issues programmatically (via `gh issue create`) need to follow the same format. No validation exists to ensure skill-generated issues have the right sections. Consider documenting the expected format for skills or adding a shared schema.
