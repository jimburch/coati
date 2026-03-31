# Test Environment Setup & Deploy Guide

This document walks through every step to set up the Coati test environment from scratch: a fresh Hostinger KVM 2 VPS running `develop.coati.sh` behind Cloudflare Access, with CI/CD that auto-deploys on push to `develop`.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Cloudflare DNS & Access Setup](#2-cloudflare-dns--access-setup)
3. [GitHub OAuth App for Test Environment](#3-github-oauth-app-for-test-environment)
4. [VPS Bootstrap](#4-vps-bootstrap)
5. [Environment Variables on the VPS](#5-environment-variables-on-the-vps)
6. [GitHub Actions Secrets](#6-github-actions-secrets)
7. [First Deploy (Manual Verification)](#7-first-deploy-manual-verification)
8. [Seeding Mock Data](#8-seeding-mock-data)
9. [Test CLI Setup](#9-test-cli-setup)
10. [CI/CD Pipeline Reference](#10-cicd-pipeline-reference)
11. [Day-to-Day Operations](#11-day-to-day-operations)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Before starting, you need:

- **Hostinger KVM 2 VPS** — fresh Ubuntu 22.04+ (or Debian 12+) with root SSH access
- **Domain**: `coati.sh` with DNS managed by Cloudflare
- **Cloudflare account** (free plan is fine)
- **GitHub account** with admin access to `jimburch/coati`
- **GitHub Personal Access Token (PAT)** with `read:packages` scope (for installing the test CLI from GitHub Packages)

Gather these before proceeding:

| Item                            | Where to get it                                                 |
| ------------------------------- | --------------------------------------------------------------- |
| VPS IP address                  | Hostinger dashboard → VPS → Overview                            |
| VPS root password (or SSH key)  | Hostinger dashboard → VPS → SSH Access                          |
| Cloudflare API token (optional) | Cloudflare dashboard → My Profile → API Tokens                  |
| GitHub PAT with `read:packages` | GitHub → Settings → Developer Settings → Personal Access Tokens |

---

## 2. Cloudflare DNS & Access Setup

### 2a. Add DNS record

1. Go to Cloudflare dashboard → `coati.sh` → DNS → Records
2. Add a new record:
   - **Type**: A
   - **Name**: `develop`
   - **IPv4 address**: your VPS IP
   - **Proxy status**: Proxied (orange cloud) — this is required for Cloudflare Access
   - **TTL**: Auto
3. Click Save

Verify: `dig develop.coati.sh` should resolve (may take a few minutes to propagate).

### 2b. Create Cloudflare Access application

1. Go to Cloudflare dashboard → Zero Trust → Access → Applications
2. Click "Add an application" → Self-hosted
3. Configure:
   - **Application name**: `Coati Test Environment`
   - **Session duration**: 24 hours
   - **Application domain**: `develop.coati.sh`
   - **Path**: leave empty (protects entire subdomain)
4. Add an Access policy:
   - **Policy name**: `Admin access`
   - **Action**: Allow
   - **Include rule**: Emails — add your email address (and any other testers)
   - **Authentication method**: One-time PIN (or GitHub if you prefer)
5. Save the application

### 2c. Create Cloudflare Access service token (for CLI)

1. Go to Zero Trust → Access → Service Auth → Service Tokens
2. Click "Create Service Token"
   - **Name**: `coati-dev-cli`
   - **Duration**: 1 year (you can rotate later)
3. **Immediately copy both values** — the secret is only shown once:
   - `CF-Access-Client-Id`: (e.g., `abc123.access`)
   - `CF-Access-Client-Secret`: (e.g., `def456secret...`)
4. Store these securely — you'll need them for GitHub Actions secrets and your local CLI config

### 2d. Add service token to the Access policy

1. Go back to your Access application → Policies
2. Edit the policy (or add a new one):
   - **Policy name**: `CLI Service Token`
   - **Action**: Service Auth
   - **Include rule**: Service Token — select `coati-dev-cli`
3. Save

Now requests with the correct `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers bypass the login screen.

---

## 3. GitHub OAuth App for Test Environment

You need a separate GitHub OAuth app for the test subdomain because OAuth callbacks are URL-specific.

1. Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Fill in:
   - **Application name**: `Coati (Test)`
   - **Homepage URL**: `https://develop.coati.sh`
   - **Authorization callback URL**: `https://develop.coati.sh/auth/callback/github`
3. Click "Register application"
4. Copy the **Client ID**
5. Click "Generate a new client secret" and copy the **Client Secret**

Store both — you'll need them for the VPS environment file and GitHub Actions secrets.

---

## 4. VPS Bootstrap

### 4a. SSH into the VPS

```bash
ssh root@<your-vps-ip>
```

If this is your first connection, accept the host key fingerprint.

### 4b. Upload and run the bootstrap script

From your local machine (in the coati repo root):

```bash
scp scripts/bootstrap-vps.sh root@<your-vps-ip>:/tmp/bootstrap-vps.sh
ssh root@<your-vps-ip> 'chmod +x /tmp/bootstrap-vps.sh && /tmp/bootstrap-vps.sh'
```

The bootstrap script does the following (all idempotent — safe to re-run):

1. **System updates**: `apt update && apt upgrade`
2. **Node.js 22**: Installs via NodeSource repository
3. **pnpm**: Installs globally via corepack
4. **PM2**: Installs globally via npm, configures startup on boot
5. **PostgreSQL 17**: Installs, starts, enables on boot
6. **Creates databases**:
   - `coati_dev` (test environment)
   - `coati_prod` (placeholder for production)
   - Database user `coati` with a generated password
7. **Caddy**: Installs from official Caddy repository, enables on boot
8. **Deploy user**: Creates a `deploy` system user with:
   - Home directory at `/opt/coati`
   - SSH authorized_keys (you'll add your CI key here)
   - Ownership of `/opt/coati/dev` and `/opt/coati/prod` directories
9. **Directory structure**:
   ```
   /opt/coati/
   ├── dev/          # Test environment app
   │   ├── .env      # Environment variables (template created)
   │   └── build/    # SvelteKit build output (after first deploy)
   └── prod/         # Production app (placeholder)
       └── .env
   ```
10. **Caddy config**: Copies `caddy/Caddyfile` to `/etc/caddy/Caddyfile` and reloads

### 4c. Set up SSH key for CI deployments

Generate a dedicated deploy key (on your local machine):

```bash
ssh-keygen -t ed25519 -C "coati-deploy-ci" -f ~/.ssh/coati-deploy -N ""
```

Copy the public key to the VPS:

```bash
ssh root@<your-vps-ip> "mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh"
scp ~/.ssh/coati-deploy.pub root@<your-vps-ip>:/home/deploy/.ssh/authorized_keys
ssh root@<your-vps-ip> "chmod 600 /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh"
```

Test the connection:

```bash
ssh -i ~/.ssh/coati-deploy deploy@<your-vps-ip> "whoami"
# Should output: deploy
```

The **private key** (`~/.ssh/coati-deploy`) contents go into the GitHub Actions secret `DEPLOY_SSH_KEY`.

### 4d. Verify the bootstrap

SSH into the VPS and verify each component:

```bash
# Node.js
node --version        # Should show v22.x.x

# pnpm
pnpm --version        # Should show 9.x.x

# PM2
pm2 --version         # Should show 5.x.x

# PostgreSQL
sudo -u postgres psql -c "\l"
# Should list coati_dev and coati_prod databases

# Caddy
systemctl status caddy
# Should show active (running)

# Directory structure
ls -la /opt/coati/dev/
ls -la /opt/coati/prod/
```

---

## 5. Environment Variables on the VPS

Edit the test environment file on the VPS:

```bash
ssh root@<your-vps-ip>
nano /opt/coati/dev/.env
```

Fill in all values:

```env
# Database
DATABASE_URL=postgresql://coati:<db-password>@localhost:5432/coati_dev

# GitHub OAuth (Test App — from step 3)
GITHUB_CLIENT_ID=<test-oauth-client-id>
GITHUB_CLIENT_SECRET=<test-oauth-client-secret>

# Public URL
PUBLIC_SITE_URL=https://develop.coati.sh
PUBLIC_BETA_MODE=true

# Server
PORT=3001
HOST=127.0.0.1
ORIGIN=https://develop.coati.sh
```

The `<db-password>` was generated by the bootstrap script — it prints it to stdout during setup. If you missed it, you can reset it:

```bash
sudo -u postgres psql -c "ALTER USER coati WITH PASSWORD 'new-password-here';"
```

Set correct permissions:

```bash
chown deploy:deploy /opt/coati/dev/.env
chmod 600 /opt/coati/dev/.env
```

---

## 6. GitHub Actions Secrets

Go to GitHub → `jimburch/coati` → Settings → Secrets and variables → Actions → New repository secret

Add each of these:

| Secret name                | Value                                              | Notes                                |
| -------------------------- | -------------------------------------------------- | ------------------------------------ |
| `DEPLOY_SSH_KEY`           | Contents of `~/.ssh/coati-deploy` (private key)    | The ed25519 key generated in step 4c |
| `DEPLOY_HOST`              | Your VPS IP address                                | e.g., `123.45.67.89`                 |
| `DEPLOY_USER`              | `deploy`                                           | The deploy user created by bootstrap |
| `DEV_DATABASE_URL`         | `postgresql://coati:<pw>@localhost:5432/coati_dev` | Same as in the VPS `.env`            |
| `DEV_GITHUB_CLIENT_ID`     | Test OAuth app Client ID                           | From step 3                          |
| `DEV_GITHUB_CLIENT_SECRET` | Test OAuth app Client Secret                       | From step 3                          |
| `CF_ACCESS_CLIENT_ID`      | Cloudflare service token Client ID                 | From step 2c                         |
| `CF_ACCESS_CLIENT_SECRET`  | Cloudflare service token Client Secret             | From step 2c                         |

Also set up authentication for GitHub Packages publishing. Go to Settings → Secrets and variables → Actions and confirm that `GITHUB_TOKEN` has write access to packages (this is automatic for GitHub Actions in the same repo).

---

## 7. First Deploy (Manual Verification)

After all secrets are set, push to `develop` to trigger the CI/CD pipeline:

```bash
git checkout develop
git push origin develop
```

Monitor the deploy:

1. Go to GitHub → Actions → "Deploy Dev" workflow
2. Watch for green checkmarks on each step: build → rsync → migrate → restart

### Verify the deploy

```bash
# SSH into VPS
ssh deploy@<your-vps-ip>

# Check PM2
pm2 status
# Should show coati-dev as "online"

# Check logs
pm2 logs coati-dev --lines 20
# Should show SvelteKit startup with "Listening on 127.0.0.1:3001"

# Check Caddy is proxying
curl -I http://localhost:3001
# Should return 200 OK
```

In your browser:

1. Visit `https://develop.coati.sh`
2. Cloudflare Access should prompt you for authentication (email OTP or GitHub)
3. After authenticating, you should see the Coati homepage
4. Test GitHub OAuth: click "Sign in with GitHub" — should redirect and return correctly

---

## 8. Seeding Mock Data

### Run the seed script

The seed script is run on-demand, not on every deploy. You can trigger it two ways:

**Option A: From your local machine (requires DATABASE_URL tunnel)**

```bash
# Open an SSH tunnel to the VPS PostgreSQL
ssh -L 15432:localhost:5432 deploy@<your-vps-ip> -N &

# Run the seed script through the tunnel
DATABASE_URL=postgresql://coati:<pw>@localhost:15432/coati_dev pnpm run seed:dev

# Kill the tunnel when done
kill %1
```

**Option B: Via GitHub Actions (manual trigger)**

1. Go to GitHub → Actions → "Seed Dev Database" workflow
2. Click "Run workflow"
3. Select `develop` branch
4. Click "Run workflow"

The workflow SSHs into the VPS and runs the seed script remotely.

### What the seed script creates

- **~30-45 users**: Real GitHub profiles (torvalds, gaearon, sindresorhus, etc.) with actual avatars and bios fetched from the GitHub API
- **~90-150 setups**: Distributed across all component types (skills, hooks, commands, MCP servers, config files), with varying file counts, tags, and agents
- **Stars**: Randomly distributed, with some setups being highly starred (trending) and others with zero
- **Follows**: A social graph between users
- **Comments**: Including threaded replies on various setups
- **Activity feed**: Entries for recent actions
- **Edge cases**: Setups with no files, users with no setups, very long descriptions, maximum tags

### Resetting the test database

To wipe all data and re-seed:

```bash
pnpm run seed:dev
```

The script truncates all tables before inserting, so it's safe to run repeatedly.

---

## 9. Test CLI Setup

### Install the test CLI

```bash
# Authenticate with GitHub Packages (one-time)
npm login --registry=https://npm.pkg.github.com
# Username: your GitHub username
# Password: your GitHub PAT (with read:packages scope)
# Email: your email

# Install the test CLI globally
npm install -g @jimburch/coati-dev --registry=https://npm.pkg.github.com
```

### Configure Cloudflare Access credentials

The test CLI needs the Cloudflare Access service token to reach the protected API:

```bash
# The test CLI binary is named `coati-dev` to avoid conflict with production
coati-dev login
```

Or manually edit `~/.coati/config.json`:

```json
{
	"apiBase": "https://develop.coati.sh/api/v1",
	"cfAccessClientId": "<your-CF-Access-Client-Id>",
	"cfAccessClientSecret": "<your-CF-Access-Client-Secret>",
	"token": "<your-auth-token-after-login>"
}
```

### Verify the CLI

```bash
coati-dev search claude
# Should return setups from the seeded test data

coati-dev view torvalds/some-setup-slug
# Should display a setup from the mock data
```

### Updating the test CLI

When new CLI changes are pushed to `develop`, the GitHub Actions workflow publishes a new version. Update with:

```bash
npm update -g @jimburch/coati-dev --registry=https://npm.pkg.github.com
```

---

## 10. CI/CD Pipeline Reference

### Deploy Dev (`.github/workflows/deploy-dev.yml`)

**Triggers**: Push to `develop` branch

**Steps**:

1. Checkout `develop`
2. Set up Node.js 22 + pnpm
3. `pnpm install`
4. `pnpm build` (SvelteKit production build)
5. rsync to VPS:
   - `build/` → `/opt/coati/dev/build/`
   - `package.json` + `pnpm-lock.yaml` → `/opt/coati/dev/`
   - `drizzle/` → `/opt/coati/dev/drizzle/` (migrations)
   - `node_modules/` or run `pnpm install --prod` on server
6. SSH: `cd /opt/coati/dev && pnpm db:migrate`
7. SSH: `pm2 restart coati-dev`

### Publish Test CLI (`.github/workflows/publish-cli-dev.yml`)

**Triggers**: Push to `develop` branch, only when files in `cli/` change

**Steps**:

1. Checkout `develop`
2. Set up Node.js 22 + pnpm + GitHub Packages auth
3. `cd cli && pnpm install && pnpm build`
4. Override package name to `@jimburch/coati-dev` and API base to `https://develop.coati.sh/api/v1`
5. `npm publish --registry=https://npm.pkg.github.com`

### Seed Dev Database (`.github/workflows/seed-dev.yml`)

**Triggers**: Manual (workflow_dispatch) only

**Steps**:

1. SSH into VPS
2. Run `cd /opt/coati/dev && node scripts/seed-dev.js`

---

## 11. Day-to-Day Operations

### Deploying changes

Just push to `develop`. CI handles everything.

```bash
git checkout develop
git merge feature/my-feature
git push origin develop
# Watch GitHub Actions for deploy status
```

### Checking server health

```bash
# PM2 process status
ssh deploy@<your-vps-ip> "pm2 status"

# Application logs (last 50 lines)
ssh deploy@<your-vps-ip> "pm2 logs coati-dev --lines 50"

# PostgreSQL status
ssh root@<your-vps-ip> "systemctl status postgresql"

# Caddy status
ssh root@<your-vps-ip> "systemctl status caddy"

# Disk usage
ssh root@<your-vps-ip> "df -h"
```

### Running migrations manually

```bash
ssh deploy@<your-vps-ip> "cd /opt/coati/dev && node_modules/.bin/drizzle-kit migrate"
```

### Restarting the test environment

```bash
ssh deploy@<your-vps-ip> "pm2 restart coati-dev"
```

### Viewing Caddy access logs

```bash
ssh root@<your-vps-ip> "journalctl -u caddy -f"
```

---

## 12. Troubleshooting

### "502 Bad Gateway" on develop.coati.sh

The SvelteKit process isn't running or isn't listening on port 3001.

```bash
ssh deploy@<your-vps-ip> "pm2 status"
# If coati-dev shows "errored" or "stopped":
ssh deploy@<your-vps-ip> "pm2 logs coati-dev --lines 50"
# Fix the issue, then:
ssh deploy@<your-vps-ip> "pm2 restart coati-dev"
```

### Cloudflare Access blocks the OAuth callback

This shouldn't happen because you authenticate with Cloudflare Access _before_ clicking "Sign in with GitHub." The CF Access session cookie persists through the OAuth redirect. If it does happen:

1. Clear cookies for `develop.coati.sh`
2. Visit `https://develop.coati.sh` fresh — authenticate with Cloudflare Access
3. Then click "Sign in with GitHub"

### CLI gets 403 from the test API

The Cloudflare Access service token is missing or expired.

```bash
# Verify your config has CF credentials
cat ~/.coati/config.json
# Should have cfAccessClientId and cfAccessClientSecret

# Test directly with curl
curl -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>" https://develop.coati.sh/api/v1/health
# Should return { "data": "ok" } or similar
```

If the service token expired, create a new one in Cloudflare Zero Trust and update your config + GitHub Actions secrets.

### Database migration fails on deploy

```bash
# Check migration logs
ssh deploy@<your-vps-ip> "pm2 logs coati-dev --lines 50"

# Run migration manually with verbose output
ssh deploy@<your-vps-ip> "cd /opt/coati/dev && DATABASE_URL=<url> node_modules/.bin/drizzle-kit migrate"
```

### PM2 process disappears after VPS reboot

The PM2 startup script may not have been saved:

```bash
ssh root@<your-vps-ip>
pm2 startup
# Follow the output instructions
su - deploy
pm2 start ecosystem.config.cjs
pm2 save
```

### Seed script fails with GitHub API rate limit

The seed script fetches real GitHub profiles. Unauthenticated GitHub API requests are limited to 60/hour. If you're rate-limited:

1. Wait an hour, or
2. Set a `GITHUB_TOKEN` env var before running the seed script — this raises the limit to 5,000/hour:
   ```bash
   GITHUB_TOKEN=ghp_xxxx pnpm run seed:dev
   ```
