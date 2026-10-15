#!/usr/bin/env bash
# PreToolUse hook — enforces Claude's lane.
# If Claude tries to edit a file that's in Cursor's lane, block the tool call
# with exit code 2 and a clear message.
#
# The Claude Code PreToolUse hook receives the pending tool call on stdin as
# JSON. We extract the file_path and check it against the lane rules.

set -euo pipefail

payload=$(cat)
file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

if [ -z "$file" ]; then
  exit 0
fi

# Cursor's lane — block edits here.
case "$file" in
  *src/lib/components/*|\
  *+page.svelte|\
  *+layout.svelte|\
  *src/app.css|\
  *tailwind.config.*)
    echo "Blocked: \"$file\" is in Cursor's lane." >&2
    echo "" >&2
    echo "Compose uses a two-agent split. Frontend files are owned by Cursor." >&2
    echo "If this task needs frontend work, stop and write a handoff note (try /handoff)." >&2
    echo "If you believe this rule should change, the user has to update CLAUDE.md." >&2
    exit 2
    ;;
esac

exit 0
