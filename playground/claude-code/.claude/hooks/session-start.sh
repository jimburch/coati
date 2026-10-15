#!/usr/bin/env bash
# SessionStart hook — surface a concise project snapshot into context.
# Output becomes part of the system context for this session.

set -euo pipefail

echo "## Linkly — session snapshot"
echo
echo "Branch: $(git symbolic-ref --short HEAD 2>/dev/null || echo 'detached')"
echo "Dirty files: $(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
echo
echo "Recent commits:"
git log --oneline -5 2>/dev/null | sed 's/^/  /'
echo
if [ -f drizzle.config.ts ]; then
  migrations=$(ls -1 src/lib/server/db/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
  echo "Drizzle migrations: $migrations"
fi
