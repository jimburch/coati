#!/usr/bin/env bash
# UserPromptSubmit hook — block prompts that leak secrets.
# Reads the prompt from stdin (JSON) and rejects it if common secret patterns appear.
# Exit 2 blocks the prompt and shows the reason to the user.

set -euo pipefail

prompt=$(jq -r '.prompt // empty')

if [ -z "$prompt" ]; then
  exit 0
fi

block() {
  echo "Blocked: your prompt appears to contain a secret ($1)." >&2
  echo "Scrub it and try again." >&2
  exit 2
}

# GitHub PATs
if echo "$prompt" | grep -Eq 'gh[pousr]_[A-Za-z0-9]{36,}'; then
  block "GitHub token"
fi

# OpenAI keys
if echo "$prompt" | grep -Eq 'sk-[A-Za-z0-9_\-]{32,}'; then
  block "OpenAI-style key"
fi

# AWS access keys
if echo "$prompt" | grep -Eq 'AKIA[0-9A-Z]{16}'; then
  block "AWS access key"
fi

# Postgres URLs with inline passwords
if echo "$prompt" | grep -Eq 'postgres(ql)?://[^:]+:[^@]+@'; then
  block "Postgres URL with password"
fi

exit 0
