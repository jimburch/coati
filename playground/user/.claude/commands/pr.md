---
description: Open a pull request with a body I'd actually write
argument-hint: "[base-branch]"
---

# /pr

Create a pull request for the current branch against `$1` (default `main`).

## Steps

1. Run in parallel:
   - `git status` (should be clean; uncommitted work means stop)
   - `git log $1..HEAD --oneline`
   - `git diff $1...HEAD --stat`
   - `gh pr view 2>/dev/null` (check if a PR already exists)
2. If a PR exists, print its URL and stop.
3. If there are uncommitted changes, stop and tell me.
4. Confirm the branch is pushed. If not, run `git push -u origin HEAD`.
5. Read all commits' subjects and bodies. Synthesize:
   - PR title: Conventional Commits format, under 70 chars
   - Summary: 2–3 sentences explaining the WHY — not a list of commits
   - Changes: bulleted list of the 3–5 most notable changes (not every file)
   - Test plan: checklist of what I should test
   - Linked issue: search commits and branch name for `#NNN`, include if found
6. Show me the draft title and body. Wait for approval.
7. On approval:
   ```
   gh pr create --base $1 --title "<title>" --body "$(cat <<'EOF'
   ## Summary
   ...
   ## Changes
   - ...
   ## Test plan
   - [ ] ...
   EOF
   )"
   ```
8. Print the PR URL.

## Rules

- Never push with `--force` without my explicit request
- Never open draft PRs unless I ask
- Never copy commit messages verbatim into the PR body — synthesize
- Never include a "🤖 Generated with" trailer unless I ask (globally disabled)
