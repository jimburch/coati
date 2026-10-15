---
description: Create a Conventional Commits commit with a thoughtful message
argument-hint: "[scope]"
---

# /commit

Create a single, well-formed commit from the currently staged changes (or the
working tree if nothing is staged yet).

## Steps

1. Run `git status` and `git diff --cached`. If nothing is staged:
   - List unstaged changes via `git diff`
   - Ask which files to stage (or confirm staging all)
2. Run `git log --oneline -10` to match the repo's existing commit style —
   some repos use scopes like `(api):`, some don't
3. Analyze the diff. Identify:
   - The primary change (one behavior at a time)
   - The Conventional Commits type: feat, fix, refactor, perf, test, docs, chore, style, build, ci
   - A scope if the repo uses them
4. Draft a commit message:
   - Subject: `<type>(<scope>): <imperative summary>` — under 60 chars
   - Blank line
   - Body: one paragraph on WHY, not WHAT
   - Blank line
   - Issue reference if there's a matching one: `Closes #N` or `Refs #N`
5. Show the full draft to me. Wait for approval.
6. On approval, commit with:
   ```
   git commit -m "$(cat <<'EOF'
   <message>
   EOF
   )"
   ```
7. Run `git status` to confirm success.

## Rules

- NEVER commit without showing me the message first
- NEVER use `--amend` unless I explicitly ask
- NEVER use `--no-verify` unless I explicitly ask
- If pre-commit hooks fail, report the failure — do not retry with `--no-verify`
- If the diff contains multiple unrelated changes, refuse and ask me to split it
- If a file likely contains secrets (`.env`, credentials.json, `*.pem`), warn loudly

## Co-authorship

Do not add `Co-Authored-By` unless I ask. Global settings disable the
automatic trailer.
