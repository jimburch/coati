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
SUMMARY_FILE=$(mktemp)
MAX_ATTEMPTS=10
ATTEMPT_TIMEOUT=1000

echo "Processing $TASK_COUNT tasks sequentially (max $MAX_ATTEMPTS attempts each)..."
echo ""

# --- Ensure the 'complete' label exists (needed to mark finished issues) ---

gh label create "complete" --description "Issue completed by Ralph worker" --color "0e8a16" 2>/dev/null || true

# --- Track issues completed in this run (avoids GitHub API label propagation delays) ---

COMPLETED_IN_RUN=""

# --- Fetch recent commits on this branch ---

echo "Fetching recent commits on branch..."
RECENT_COMMITS=$(git log develop..HEAD -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No prior commits on this branch")

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

  # --- Check if issue is still open (may have been closed externally) ---

  ISSUE_STATE=$(gh issue view "$ISSUE_NUM" --json state -q '.state')
  if [ "$ISSUE_STATE" != "OPEN" ]; then
    echo "Issue #$ISSUE_NUM is already closed. Skipping."
    echo ""
    INDEX=$((INDEX + 1))
    continue
  fi

  # --- Check blockers are resolved ---

  ISSUE_BODY=$(gh issue view "$ISSUE_NUM" --json body -q '.body')
  BLOCKED=false
  for blocker in $(echo "$ISSUE_BODY" | grep -oP '(?<=Blocked by #)\d+' || true); do
    # Check if the blocker was completed earlier in this run
    if echo "$COMPLETED_IN_RUN" | grep -qw "$blocker"; then
      continue
    fi
    BLOCKER_STATE=$(gh issue view "$blocker" --json state,labels -q '{state: .state, labels: [.labels[].name]}' 2>/dev/null || echo '{"state":"UNKNOWN","labels":[]}')
    if echo "$BLOCKER_STATE" | jq -e '.state == "OPEN" and (.labels | index("complete") | not)' > /dev/null 2>&1; then
      echo "Issue #$ISSUE_NUM is blocked by open issue #$blocker. Skipping."
      BLOCKED=true
      break
    fi
  done

  if [ "$BLOCKED" = true ]; then
    echo ""
    INDEX=$((INDEX + 1))
    continue
  fi

  # --- Fetch issue context ---

  echo "Fetching issue #$ISSUE_NUM context..."
  ISSUE_JSON=$(gh issue view "$ISSUE_NUM" --json number,title,body,labels,comments)
  ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')

  # --- Build initial prompt ---

  WORKER_PROMPT=$(cat "$SCRIPT_DIR/worker-prompt.md")

  COMMIT_TYPE=$(echo "$TASK" | jq -r '.commit_type // "feat"')

  FULL_PROMPT="## Your Task

${TASK_PROMPT}

## Issue Context

${ISSUE_JSON}

## Commit Type

Use \`${COMMIT_TYPE}\` as the semantic commit type for this task.

## Previous Commits on This Branch

${RECENT_COMMITS}

${WORKER_PROMPT}"

  # --- Retry loop ---

  LAST_COMMIT_BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")
  TASK_SUCCEEDED=false
  GATE_OUTPUT=""

  for ATTEMPT in $(seq 1 $MAX_ATTEMPTS); do
    echo "------------------------------------------"
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS for issue #$ISSUE_NUM"
    echo "------------------------------------------"
    echo ""

    # --- Build prompt (initial or retry) ---

    if [ "$ATTEMPT" -eq 1 ]; then
      PROMPT_TO_SEND="$FULL_PROMPT"
    else
      # Build retry prompt with failure context
      DIFF_CONTEXT=""
      CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
      if [ "$CURRENT_COMMIT" = "$LAST_COMMIT_BEFORE" ]; then
        # No commit was produced — include uncommitted changes
        UNCOMMITTED_DIFF=$(git diff 2>/dev/null || echo "")
        if [ -n "$UNCOMMITTED_DIFF" ]; then
          DIFF_CONTEXT="Uncommitted changes from your previous attempt:
$UNCOMMITTED_DIFF"
        fi
      fi

      PROMPT_TO_SEND="Your previous attempt for issue #$ISSUE_NUM did not pass quality gates.

Errors:
$GATE_OUTPUT

${DIFF_CONTEXT}

Fix these issues. Re-run the quality gates (pnpm check && pnpm lint && pnpm test:unit --run). If they pass, commit. If you cannot fix them, do not commit — explain what's blocking you."
    fi

    # --- Run Claude Code ---

    echo "Running Claude Code worker..."
    echo ""

    tmpfile=$(mktemp)

    stream_text='select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'
    final_result='select(.type == "result").result // empty'

    echo "$PROMPT_TO_SEND" | timeout "${ATTEMPT_TIMEOUT}" claude -p \
      --dangerously-skip-permissions \
      --output-format stream-json \
      --verbose \
    | grep --line-buffered '^{' \
    | tee "$tmpfile" \
    | jq --unbuffered -rj "$stream_text" || {
      TIMEOUT_EXIT=$?
      if [ "$TIMEOUT_EXIT" -eq 124 ]; then
        echo ""
        echo "Attempt $ATTEMPT timed out after ${ATTEMPT_TIMEOUT}s."
      else
        echo ""
        echo "Attempt $ATTEMPT exited with code $TIMEOUT_EXIT."
      fi
    }

    echo ""
    echo "Claude finished attempt $ATTEMPT for issue #$ISSUE_NUM."

    # --- Check if Claude committed ---

    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

    if [ "$CURRENT_COMMIT" != "$LAST_COMMIT_BEFORE" ]; then
      echo "New commit detected."

      # --- Schema migration gate: if schema.ts changed, ensure migration was generated ---

      SCHEMA_CHANGED=$(git diff --name-only HEAD~1 -- 'src/lib/server/db/schema.ts' 2>/dev/null || echo "")
      MIGRATION_ADDED=$(git diff --name-only HEAD~1 -- 'drizzle/*.sql' 2>/dev/null || echo "")

      if [ -n "$SCHEMA_CHANGED" ] && [ -z "$MIGRATION_ADDED" ]; then
        echo "schema.ts changed but no migration file found in commit. Generating migration..."

        if pnpm db:generate 2>&1; then
          # Check if drizzle-kit actually produced new files
          NEW_MIGRATION_FILES=$(git diff --name-only -- 'drizzle/*.sql' 'drizzle/meta/*' 2>/dev/null || echo "")
          if [ -n "$NEW_MIGRATION_FILES" ]; then
            echo "Migration generated. Amending commit with migration files..."
            git add drizzle/
            git commit --amend --no-edit
            CURRENT_COMMIT=$(git rev-parse HEAD)
          else
            echo "drizzle-kit generate ran but produced no new files (schema change may not affect DB structure)."
          fi
        else
          echo "ERROR: drizzle-kit generate failed. Resetting commit."
          GATE_OUTPUT="drizzle-kit generate failed after schema.ts was changed. Ensure DATABASE_URL is set or that the schema change is valid."
          git reset HEAD~1 --hard
          continue
        fi
      fi

      # --- Auto-fix formatting before quality gates ---

      echo "Running prettier auto-fix..."
      pnpm prettier --write . 2>/dev/null || true

      # If prettier changed files, amend the commit
      if ! git diff --quiet; then
        echo "Prettier fixed formatting issues. Amending commit..."
        git add -A
        git commit --amend --no-edit
        CURRENT_COMMIT=$(git rev-parse HEAD)
      fi

      echo "Running external quality gates..."

      # --- Run quality gates externally ---

      GATE_OUTPUT_FILE=$(mktemp)
      if pnpm check 2>&1 | tee "$GATE_OUTPUT_FILE" && \
         pnpm lint 2>&1 | tee -a "$GATE_OUTPUT_FILE" && \
         pnpm test:unit --run 2>&1 | tee -a "$GATE_OUTPUT_FILE"; then
        echo ""
        echo "Quality gates PASSED on attempt $ATTEMPT."
        TASK_SUCCEEDED=true
        LAST_COMMIT_BEFORE="$CURRENT_COMMIT"
        rm -f "$GATE_OUTPUT_FILE"
        break
      else
        echo ""
        echo "Quality gates FAILED on attempt $ATTEMPT."
        GATE_OUTPUT=$(cat "$GATE_OUTPUT_FILE")
        rm -f "$GATE_OUTPUT_FILE"

        # Reset the failed commit
        echo "Resetting failed commit..."
        git reset HEAD~1 --hard
      fi
    else
      echo "No commit produced on attempt $ATTEMPT."
      # Capture gate output for retry context even without a commit
      GATE_OUTPUT_FILE=$(mktemp)
      pnpm check 2>&1 | tee "$GATE_OUTPUT_FILE" || true
      pnpm lint 2>&1 | tee -a "$GATE_OUTPUT_FILE" || true
      pnpm test:unit --run 2>&1 | tee -a "$GATE_OUTPUT_FILE" || true
      GATE_OUTPUT=$(cat "$GATE_OUTPUT_FILE")
      rm -f "$GATE_OUTPUT_FILE"
    fi

    rm -f "$tmpfile"
  done

  # --- Handle task result ---

  if [ "$TASK_SUCCEEDED" = true ]; then
    # --- Extract testing instructions from last successful run ---

    RESULT=$(jq -r "$final_result" "$tmpfile" 2>/dev/null || echo "")
    TEST_INSTRUCTIONS=$(echo "$RESULT" | sed -n '/<test_instructions>/,/<\/test_instructions>/p' | sed '1d;$d')

    {
      echo "### Issue #$ISSUE_NUM: $ISSUE_TITLE"
      echo ""
      if [ -n "$TEST_INSTRUCTIONS" ]; then
        echo "$TEST_INSTRUCTIONS"
      else
        echo "_No testing instructions provided by worker._"
      fi
      echo ""
    } >> "$SUMMARY_FILE"

    # --- Push to feature branch ---

    echo "Pushing to ${BRANCH_NAME} branch..."
    git push origin "$BRANCH_NAME"

    # --- Mark issue as complete (stays open until PR merges) ---

    echo "Marking issue #$ISSUE_NUM as complete..."
    gh issue comment "$ISSUE_NUM" --body "Completed by Ralph (attempt $ATTEMPT/$MAX_ATTEMPTS). Committed to \`${BRANCH_NAME}\` branch. Issue will close when the PR is merged."
    gh issue edit "$ISSUE_NUM" --add-label "complete" 2>/dev/null || true

    # --- Update recent commits for next iteration ---

    RECENT_COMMITS=$(git log develop..HEAD -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No prior commits on this branch")

    rm -f "$tmpfile"

    COMPLETED_IN_RUN="$COMPLETED_IN_RUN $ISSUE_NUM"

    echo ""
    echo "Issue #$ISSUE_NUM complete."
  else
    # --- Task failed after all attempts ---

    echo ""
    echo "Issue #$ISSUE_NUM FAILED after $MAX_ATTEMPTS attempts."

    # Roll back any uncommitted changes
    git checkout . 2>/dev/null || true
    git clean -fd 2>/dev/null || true

    # Comment on the issue with failure details
    FAILURE_COMMENT="Ralph failed after $MAX_ATTEMPTS attempts. Last quality gate errors:

\`\`\`
$(echo "$GATE_OUTPUT" | head -100)
\`\`\`

Relabeling as HITL for human review."

    gh issue comment "$ISSUE_NUM" --body "$FAILURE_COMMENT"

    # Swap AFK → HITL label
    gh issue edit "$ISSUE_NUM" --remove-label "AFK" 2>/dev/null || true
    gh issue edit "$ISSUE_NUM" --add-label "HITL" 2>/dev/null || true

    {
      echo "### Issue #$ISSUE_NUM: $ISSUE_TITLE"
      echo ""
      echo "_FAILED after $MAX_ATTEMPTS attempts. Relabeled as HITL._"
      echo ""
    } >> "$SUMMARY_FILE"

    echo "Issue #$ISSUE_NUM marked as HITL."
  fi

  echo ""
  INDEX=$((INDEX + 1))
done

echo "=========================================="
echo "All $TASK_COUNT tasks processed."
echo "=========================================="
echo ""
echo "=========================================="
echo "MANUAL TESTING GUIDE"
echo "=========================================="
echo ""
cat "$SUMMARY_FILE"

# --- Write summary to file for workflow to pick up ---

cp "$SUMMARY_FILE" /tmp/ralph_summary.txt
rm -f "$SUMMARY_FILE"
