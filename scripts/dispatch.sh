#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
REPO_ROOT="$(git rev-parse --show-toplevel)"

echo "Fetching open issues labeled 'ralph' by jimburch..."
ISSUES=$(gh issue list --label ralph --state open --author jimburch --json number,title,body,labels,comments --limit 100)

ISSUE_COUNT=$(echo "$ISSUES" | jq 'length')
echo "Found $ISSUE_COUNT open ralph issues."

if [ "$ISSUE_COUNT" -eq 0 ]; then
  echo "No open ralph issues. Nothing to dispatch."
  exit 0
fi

echo "Checking for in-progress workflow runs..."
IN_PROGRESS_RUNS=$(gh run list --workflow=claude-work.yml --status=in_progress --json databaseId -q 'length' 2>/dev/null || echo "0")
QUEUED_RUNS=$(gh run list --workflow=claude-work.yml --status=queued --json databaseId -q 'length' 2>/dev/null || echo "0")

if [ "$IN_PROGRESS_RUNS" -gt 0 ] || [ "$QUEUED_RUNS" -gt 0 ]; then
  echo "Ralph is already running ($IN_PROGRESS_RUNS in progress, $QUEUED_RUNS queued). Skipping dispatch."
  exit 0
fi

echo ""
echo "Asking orchestrator to analyze and order issues..."
echo ""

PROMPT="$(cat "$REPO_ROOT/scripts/dispatch-prompt.md")

## Open Issues

$ISSUES"

RESULT=$(echo "$PROMPT" | claude -p \
  --model sonnet \
  --allowedTools "Read,Grep,Glob")

echo "$RESULT"

# Extract branch name from <branch_name> tags (handles single-line and multi-line)
BRANCH_NAME=$(echo "$RESULT" | perl -0777 -ne 'print $1 if /<branch_name>\s*(.*?)\s*<\/branch_name>/s')

if [ -z "$BRANCH_NAME" ]; then
  echo ""
  echo "Error: Orchestrator did not return a branch name."
  exit 1
fi

echo "Branch: $BRANCH_NAME"

# Extract JSON from <task_json> tags (handles single-line and multi-line)
TASKS=$(echo "$RESULT" | perl -0777 -ne 'print $1 if /<task_json>\s*(.*?)\s*<\/task_json>/s')

# Validate we got valid JSON array
if ! echo "$TASKS" | jq -e 'type == "array"' > /dev/null 2>&1; then
  echo ""
  echo "Error: Orchestrator did not return a valid JSON array."
  echo "Raw output:"
  echo "$TASKS"
  exit 1
fi

TASK_COUNT=$(echo "$TASKS" | jq 'length')

if [ "$TASK_COUNT" -eq 0 ]; then
  echo ""
  echo "Orchestrator found no actionable tasks."
  exit 0
fi

echo ""
echo "Dispatching $TASK_COUNT tasks (sequential processing):"
echo ""

echo "$TASKS" | jq -c '.[]' | while read -r task; do
  ISSUE_NUM=$(echo "$task" | jq -r '.issue_number')
  TASK_PROMPT=$(echo "$task" | jq -r '.prompt')
  echo "  $ISSUE_NUM. ${TASK_PROMPT:0:100}..."
done

echo ""

gh workflow run claude-work.yml \
  -f tasks="$(echo "$TASKS" | jq -c '.')" \
  -f branch="$BRANCH_NAME"

echo "Dispatched. Run 'gh run list --workflow=claude-work.yml' to monitor."
