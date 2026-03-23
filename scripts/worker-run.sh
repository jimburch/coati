#!/bin/bash
set -eo pipefail

# Usage: worker-run.sh
#
# Environment variables required:
#   CLAUDE_CODE_OAUTH_TOKEN - Claude Code OAuth token (from GitHub App)
#   GH_TOKEN                - GitHub token for reading issues and creating PRs
#   TASKS_JSON              - JSON array of ordered tasks [{issue_number, prompt}]

if [ -z "$TASKS_JSON" ]; then
  echo "Error: TASKS_JSON env var must be set"
  exit 1
fi

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
TASK_COUNT=$(echo "$TASKS_JSON" | jq 'length')

echo "Processing $TASK_COUNT tasks sequentially..."
echo ""

# --- Fetch recent RALPH commits ---

echo "Fetching recent RALPH commits..."
RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

# --- Process each task ---

INDEX=0
while [ "$INDEX" -lt "$TASK_COUNT" ]; do
  TASK=$(echo "$TASKS_JSON" | jq -c ".[$INDEX]")
  ISSUE_NUM=$(echo "$TASK" | jq -r '.issue_number')
  TASK_PROMPT=$(echo "$TASK" | jq -r '.prompt')

  echo "=========================================="
  echo "Task $((INDEX + 1))/$TASK_COUNT — Issue #$ISSUE_NUM"
  echo "=========================================="
  echo ""

  # --- Fetch issue context ---

  echo "Fetching issue #$ISSUE_NUM context..."
  ISSUE_JSON=$(gh issue view "$ISSUE_NUM" --json number,title,body,labels,comments)

  # --- Build prompt ---

  WORKER_PROMPT=$(cat "$SCRIPT_DIR/worker-prompt.md")

  FULL_PROMPT="## Your Task

${TASK_PROMPT}

## Issue Context

${ISSUE_JSON}

## Previous RALPH Commits

${RALPH_COMMITS}

${WORKER_PROMPT}"

  # --- Run Claude Code ---

  echo "Running Claude Code worker for issue #$ISSUE_NUM..."
  echo ""

  tmpfile=$(mktemp)
  trap "rm -f $tmpfile" EXIT

  stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

  echo "$FULL_PROMPT" | claude -p \
    --dangerously-skip-permissions \
    --output-format stream-json \
    --verbose \
  | grep --line-buffered '^{' \
  | tee "$tmpfile" \
  | jq --unbuffered -rj "$stream_text"

  echo ""
  echo "Worker finished issue #$ISSUE_NUM."

  # --- Push to ralph branch ---

  echo "Pushing to ralph branch..."
  git push origin ralph

  # --- Close the issue ---

  echo "Closing issue #$ISSUE_NUM..."
  gh issue close "$ISSUE_NUM" --comment "Completed by Ralph. Committed to \`ralph\` branch, will be merged into \`develop\`."
  gh issue edit "$ISSUE_NUM" --remove-label "ralph" 2>/dev/null || true

  # --- Update RALPH commits for next iteration ---

  RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

  echo ""
  echo "Issue #$ISSUE_NUM complete."
  echo ""

  INDEX=$((INDEX + 1))
done

echo "=========================================="
echo "All $TASK_COUNT tasks complete."
echo "=========================================="
