#!/usr/bin/env bash
# beforeFileEdit hook — refuse to edit files in Claude's lane.

set -euo pipefail

file="$1"

case "$file" in
  *src/lib/server/*|\
  *+page.server.ts|\
  *+server.ts|\
  *hooks.server.ts|\
  *drizzle.config.ts|\
  *src/lib/server/db/migrations/*)
    echo "Blocked: \"$file\" is in Claude's lane."
    echo ""
    echo "Compose uses a two-agent split. Backend files are owned by Claude Code."
    echo "If this task needs backend work, stop and hand off to Claude."
    exit 1
    ;;
esac

exit 0
