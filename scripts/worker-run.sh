#!/bin/bash
set -eo pipefail

# Usage: worker-run.sh <branch_name> <issue_numbers_json>
#
# Environment variables required:
#   CLAUDE_CODE_OAUTH_TOKEN - Claude Code OAuth token (from GitHub App)
#   GH_TOKEN                - GitHub token for reading issues and creating PRs
#   WORKER_PROMPT           - Task prompt for the worker (passed via env to avoid shell escaping issues)

BRANCH_NAME="$1"
ISSUE_NUMBERS="$2"
TASK_PROMPT="$WORKER_PROMPT"

if [ -z "$BRANCH_NAME" ] || [ -z "$ISSUE_NUMBERS" ] || [ -z "$TASK_PROMPT" ]; then
  echo "Usage: $0 <branch_name> <issue_numbers_json>"
  echo "WORKER_PROMPT env var must be set"
  exit 1
fi

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"

# --- Create work branch ---

echo "Creating branch: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# --- Fetch issue context ---

echo "Fetching issue context..."
ISSUE_CONTEXT=""
for num in $(echo "$ISSUE_NUMBERS" | jq -r '.[]'); do
  echo "  Fetching issue #$num..."
  ISSUE_JSON=$(gh issue view "$num" --json number,title,body,labels,comments)
  ISSUE_CONTEXT="${ISSUE_CONTEXT}${ISSUE_JSON}"$'\n\n'
done

# --- Fetch recent RALPH commits ---

echo "Fetching recent RALPH commits..."
RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

# --- Build prompt ---

WORKER_PROMPT=$(cat "$SCRIPT_DIR/worker-prompt.md")

FULL_PROMPT="## Your Task

${TASK_PROMPT}

## Issue Context

${ISSUE_CONTEXT}

## Previous RALPH Commits

${RALPH_COMMITS}

${WORKER_PROMPT}"

# --- Run Claude Code ---

echo ""
echo "Running Claude Code worker..."
echo ""

tmpfile=$(mktemp)
trap "rm -f $tmpfile" EXIT

# jq filters for streaming output
stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'
final_result='select(.type == "result").result // empty'

echo "$FULL_PROMPT" | claude -p \
  --dangerously-skip-permissions \
  --output-format stream-json \
  --verbose \
| grep --line-buffered '^{' \
| tee "$tmpfile" \
| jq --unbuffered -rj "$stream_text"

# --- Extract result and PR metadata ---

RESULT=$(jq -r "$final_result" "$tmpfile")

# Extract content between XML tags
PR_TITLE=$(echo "$RESULT" | grep -oP '(?<=<pr_title>).*?(?=</pr_title>)' || echo "$RESULT" | sed -n '/<pr_title>/,/<\/pr_title>/p' | sed '1d;$d')
PR_DESCRIPTION=$(echo "$RESULT" | sed -n '/<pr_description>/,/<\/pr_description>/p' | sed '1d;$d')

if [ -z "$PR_TITLE" ] || [ -z "$PR_DESCRIPTION" ]; then
  echo "Error: Claude did not output <pr_title> and <pr_description> tags."
  echo "Raw result:"
  echo "$RESULT"
  exit 1
fi

# --- Write PR metadata for the workflow to pick up ---

echo "$PR_TITLE" > /tmp/pr_title.txt
echo "$PR_DESCRIPTION" > /tmp/pr_description.txt

echo ""
echo "Worker complete."
echo "PR Title: $PR_TITLE"
