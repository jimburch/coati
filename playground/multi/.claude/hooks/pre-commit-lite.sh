#!/usr/bin/env bash
# PostToolUse hook — lightweight check after each edit. Runs svelte-check only
# on server files (Claude's lane). Keeps the loop fast.

set -euo pipefail

payload=$(cat)
file=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)

case "$file" in
  *src/lib/server/*|\
  */+page.server.ts|\
  */+server.ts|\
  */hooks.server.ts|\
  *drizzle.config.ts|\
  *src/lib/types/*|\
  *src/lib/validation.ts)
    # In Claude's lane — run type check silently; surface only failures.
    if ! pnpm exec svelte-check --tsconfig ./tsconfig.json --fail-on-warnings 2>/dev/null; then
      echo "warning: svelte-check reported issues after editing $file" >&2
    fi
    ;;
esac

exit 0
