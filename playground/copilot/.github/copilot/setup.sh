#!/bin/bash
# setup.sh — Copilot Coding Agent environment setup
# This script runs when the Copilot coding agent initializes a workspace.

set -euo pipefail

echo "==> Setting up development environment..."

# Use Node.js 22 LTS if nvm is available
if command -v nvm &> /dev/null; then
  nvm install 22
  nvm use 22
fi

echo "==> Node $(node --version)"
echo "==> npm $(npm --version)"

# Install dependencies
echo "==> Installing npm dependencies..."
npm ci --ignore-scripts

# Run TypeScript compilation to verify the project builds
echo "==> Verifying TypeScript compilation..."
npx tsc --noEmit

# Run linter to catch pre-existing issues
echo "==> Running ESLint..."
npx eslint src/ --max-warnings 0 || echo "Warning: lint issues found"

# Run tests to establish baseline
echo "==> Running test suite..."
npx vitest run || echo "Warning: some tests are failing"

# Create .env from template if it doesn't exist
if [ ! -f .env ] && [ -f .env.example ]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
  echo "Note: Update .env with real values before running the app"
fi

echo "==> Environment setup complete"
