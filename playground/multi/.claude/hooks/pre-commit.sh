#!/bin/bash
# Pre-commit hook: runs lint and type-check on staged files before allowing commit.
# Install: cp .claude/hooks/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

set -euo pipefail

echo "🔍 Running pre-commit checks..."

# Get list of staged TypeScript files
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

if [ -z "$STAGED_TS_FILES" ]; then
  echo "No TypeScript files staged, skipping checks."
  exit 0
fi

# Run ESLint on staged files only
echo "  Linting staged files..."
npx eslint $STAGED_TS_FILES
if [ $? -ne 0 ]; then
  echo "❌ Lint errors found. Fix them before committing."
  exit 1
fi

# Run TypeScript type-check (whole project, since types are interconnected)
echo "  Type-checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ Type errors found. Fix them before committing."
  exit 1
fi

# Run tests related to changed files
echo "  Running related tests..."
npx vitest related $STAGED_TS_FILES --run
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Fix them before committing."
  exit 1
fi

echo "✅ All pre-commit checks passed."
