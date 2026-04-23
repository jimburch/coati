#!/usr/bin/env bash
# PostToolUse hook — auto-format files after Claude edits them.
# Claude Code passes the tool call as JSON on stdin; we extract file paths and
# run prettier against them. Keeps commits tidy without a separate format step.

set -euo pipefail

payload=$(cat)
files=$(printf '%s' "$payload" | jq -r '
  .tool_input // empty
  | if .file_path then .file_path
    elif .edits then (.edits[]?.file_path // empty)
    else empty end
' 2>/dev/null || true)

if [ -z "$files" ]; then
  exit 0
fi

while IFS= read -r f; do
  case "$f" in
    *.ts|*.svelte|*.js|*.json|*.css|*.md)
      pnpm exec prettier --write --log-level=warn "$f" >/dev/null 2>&1 || true
      ;;
  esac
done <<< "$files"

exit 0
