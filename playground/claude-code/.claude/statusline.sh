#!/usr/bin/env bash
# Statusline for Claude Code.
# Shows: cwd basename · git branch · uncommitted files · current pnpm script.

set -u

dir=$(basename "$PWD")
branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "detached")
dirty=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

if [ "$dirty" -gt 0 ]; then
  dirty_badge=" ●${dirty}"
else
  dirty_badge=""
fi

printf "linkly:%s \033[36m%s\033[0m%s" "$dir" "$branch" "$dirty_badge"
