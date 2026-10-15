#!/usr/bin/env bash
# Copilot Coding Agent bootstrap for Ledger.
# Runs once before the agent starts working — installs deps, brings up the
# test database, and generates the Prisma client.

set -euo pipefail

log() { printf '\033[36m[setup]\033[0m %s\n' "$*"; }
fail() { printf '\033[31m[setup] error:\033[0m %s\n' "$*" >&2; exit 1; }

# --- toolchain check --------------------------------------------------------

command -v pnpm >/dev/null || fail "pnpm is not installed"
command -v docker >/dev/null || fail "docker is not installed"
command -v node >/dev/null || fail "node is not installed"

NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "node 20+ required (found $NODE_MAJOR)"
fi

# --- dependencies -----------------------------------------------------------

log "installing node dependencies"
pnpm install --frozen-lockfile

# --- test database ----------------------------------------------------------

log "starting test postgres"
docker compose up -d db
for i in $(seq 1 30); do
  if docker compose exec -T db pg_isready -U ledger >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then fail "postgres never became ready"; fi
done

log "applying migrations"
pnpm db:migrate:dev --name=copilot-bootstrap

log "generating prisma client"
pnpm db:generate

# --- playwright browsers ----------------------------------------------------

log "installing playwright browsers"
pnpm exec playwright install --with-deps chromium

# --- smoke test -------------------------------------------------------------

log "running smoke tests"
pnpm check
pnpm test:unit -- --run

log "setup complete"
