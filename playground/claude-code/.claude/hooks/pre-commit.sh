#!/usr/bin/env bash
# Pre-commit hook — lint, type-check, and test staged files.
# Install: cp .claude/hooks/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -euo pipefail

echo "→ Pre-commit checks"

STAGED=$(git diff --cached --name-only --diff-filter=ACM)
TS_FILES=$(echo "$STAGED" | grep -E '\.(ts|svelte)$' || true)

if [ -z "$TS_FILES" ]; then
  echo "  no ts/svelte files staged — skipping"
  exit 0
fi

echo "  eslint…"
pnpm exec eslint $TS_FILES

echo "  svelte-check + tsc…"
pnpm run check

echo "  related tests…"
pnpm exec vitest related $TS_FILES --run --passWithNoTests

# Guardrail: if schema.ts changed but no migration was generated, block.
if echo "$STAGED" | grep -q 'src/lib/server/db/schema.ts'; then
  MIGRATIONS=$(git diff --cached --name-only -- 'src/lib/server/db/migrations' | wc -l | tr -d ' ')
  if [ "$MIGRATIONS" = "0" ]; then
    echo "✗ schema.ts changed but no migration staged — run 'pnpm db:generate'"
    exit 1
  fi
fi

echo "✓ pre-commit passed"
