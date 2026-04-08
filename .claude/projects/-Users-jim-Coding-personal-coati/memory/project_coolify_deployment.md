---
name: Coolify deployment stack
description: Coati deploys via Coolify (self-hosted) on Hostinger VPS using Docker, replacing the original PM2/Caddy/rsync approach
type: project
---

Deployment stack changed from PM2 + Caddy + rsync to **Coolify** (self-hosted) on Hostinger KVM 2 VPS (8GB RAM, Ubuntu 24.04) on 2026-04-02.

**Why:** The rsync + pnpm install --prod approach was fragile due to pnpm workspace package resolution issues, drizzle-kit requiring dev dependencies, and general complexity of maintaining a bare-metal deploy pipeline.

**How to apply:**

- The app builds via `Dockerfile` at repo root (multi-stage: build + runtime)
- Coolify manages Docker containers, Traefik reverse proxy, and PostgreSQL 18
- Environment variables are set in the Coolify dashboard, not in .env files on the VPS
- All `$env/static/private` and `$env/static/public` imports were switched to `$env/dynamic/private` and `$env/dynamic/public` so runtime env vars work with Docker
- Migrations run automatically on container start via `scripts/docker-entrypoint.sh`
- The `ecosystem.config.cjs`, `caddy/Caddyfile`, and `scripts/bootstrap-vps.sh` are legacy artifacts from the old approach
- Coolify dashboard is at `http://<vps-ip>:8000`
- Cloudflare handles DNS (proxied A record) and Access gate for develop.coati.sh
