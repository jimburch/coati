# Test Environment Setup & Deploy Guide

This document walks through every step to set up the Coati test environment from scratch: a Hostinger KVM 2 VPS running Coolify, deploying `develop.coati.sh` behind Cloudflare Access.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Cloudflare DNS & Access Setup](#2-cloudflare-dns--access-setup)
3. [GitHub OAuth App for Test Environment](#3-github-oauth-app-for-test-environment)
4. [VPS Setup & Coolify Installation](#4-vps-setup--coolify-installation)
5. [Coolify Configuration](#5-coolify-configuration)
6. [First Deploy](#6-first-deploy)
7. [Seeding Mock Data](#7-seeding-mock-data)
8. [Test CLI Setup](#8-test-cli-setup)
9. [CI/CD Pipeline Reference](#9-cicd-pipeline-reference)
10. [Day-to-Day Operations](#10-day-to-day-operations)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Before starting, you need:

- **Hostinger KVM 2 VPS** — fresh Ubuntu 24.04 with root SSH access (8GB RAM recommended)
- **Domain**: `coati.sh` with DNS managed by Cloudflare
- **Cloudflare account** (free plan is fine)
- **GitHub account** with admin access to `jimburch/coati`

Gather these before proceeding:

| Item                           | Where to get it                        |
| ------------------------------ | -------------------------------------- |
| VPS IP address                 | Hostinger dashboard → VPS → Overview   |
| VPS root password (or SSH key) | Hostinger dashboard → VPS → SSH Access |

---

## 2. Cloudflare DNS & Access Setup

### 2a. Add DNS record

1. Go to Cloudflare dashboard → `coati.sh` → DNS → Records
2. Add a new record:
   - **Type**: A
   - **Name**: `develop`
   - **IPv4 address**: your VPS IP
   - **Proxy status**: Proxied (orange cloud) — required for Cloudflare Access
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
4. Store these securely — you'll need them for your local CLI config

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

Store both — you'll need them for Coolify environment variables.

---

## 4. VPS Setup & Coolify Installation

### 4a. Provision the VPS

1. In Hostinger hPanel, create a **KVM 2 VPS** with **Ubuntu 24.04** (plain OS, no control panel)
2. Note the IP address and set a root password or upload your SSH key

### 4b. SSH into the VPS

```bash
ssh root@<your-vps-ip>
```

If you get a host key warning after reprovisioning, clear the old key:

```bash
ssh-keygen -R <your-vps-ip>
```

### 4c. Install Coolify

Run the one-line installer on the VPS:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

This installs Docker, Coolify, and all dependencies. Takes a few minutes.

### 4d. Initial Coolify setup

1. Open `http://<your-vps-ip>:8000` in your browser (later accessible at `https://coolify.coati.sh` once Cloudflare Tunnel is set up)
2. Create your admin account
3. On the server setup screen, select **"This Machine"**
4. Create a project (name it "Coati")
5. Rename the default environment to "develop" (for the test environment)

---

## 5. Coolify Configuration

### 5a. Create the PostgreSQL database

1. In Coolify, go to **Projects** → **Coati** → **develop** → **+ New Resource**
2. Select **PostgreSQL** → **PostgreSQL 18 (default)**
3. Configure:
   - **Name**: `coati-dev-db`
   - **Username**: `coati`
   - **Initial Database**: `coati_dev`
   - **Password**: Copy and save the auto-generated password
   - **Ports Mappings**: Clear (leave empty — internal Docker network only)
4. Click **Save**, then **Start**
5. Copy the **Postgres URL (internal)** — you'll need it for the app

### 5b. Set up GitHub App integration

For auto-deploy on push, Coolify needs a GitHub App (not "Public Repository"):

1. In Coolify **Settings** → **General**, set the instance URL to `https://coolify.coati.sh`
2. Go to **Sources** → **Add GitHub App**
   - **Name**: `coati-coolify`
   - **Organization**: leave empty (personal account)
   - **System Wide**: unchecked
3. Select `https://coolify.coati.sh` as the **Webhook Endpoint**, then click **Register Now**
4. Complete the GitHub authorization flow — Coolify auto-populates App ID, keys, etc.
5. Verify by clicking **Sync Name** — should show success

### 5c. Create the application resource

1. Go to **+ New Resource** → select your **coati-coolify** GitHub App source
2. Select repository `jimburch/coati`, branch `develop`
3. **Build Pack**: `Dockerfile`
4. Click **Continue**

### 5d. Configure the application

On the app Configuration page:

1. **General**:
   - **Name**: `coati-dev`
   - **Domains**: `https://develop.coati.sh`
2. **Environment Variables** — add these:

   | Key                    | Value                                      |
   | ---------------------- | ------------------------------------------ |
   | `DATABASE_URL`         | Postgres URL (internal) from step 5a       |
   | `GITHUB_CLIENT_ID`     | Test OAuth app Client ID (from step 3)     |
   | `GITHUB_CLIENT_SECRET` | Test OAuth app Client Secret (from step 3) |
   | `PUBLIC_SITE_URL`      | `https://develop.coati.sh`                 |
   | `ORIGIN`               | `https://develop.coati.sh`                 |
   | `PORT`                 | `3000`                                     |
   | `HOST`                 | `0.0.0.0`                                  |

3. Click **Save**

### 5e. How it works

Coolify pulls the `develop` branch from GitHub, builds a Docker image using the repo's `Dockerfile`, and runs it as a container. The `Dockerfile`:

1. **Build stage**: Installs all dependencies (including devDependencies), runs `pnpm build` to compile the SvelteKit app with `adapter-node`
2. **Runtime stage**: Copies only the built app, production `node_modules`, drizzle migrations, and an entrypoint script
3. **Entrypoint** (`scripts/docker-entrypoint.sh`): Runs `drizzle-kit migrate` on startup, then starts the Node.js server
4. **Healthcheck**: Pings `/api/v1/health` every 30 seconds

Environment variables are injected at runtime by Coolify — the Docker image itself contains no secrets.

---

## 6. First Deploy

1. Click **Deploy** on the app configuration page in Coolify
2. Monitor the deployment logs — you should see:
   - Docker image building (pnpm install, pnpm build)
   - Container starting
   - Migrations running
   - Healthcheck passing
3. Once deployed, visit `https://develop.coati.sh`:
   - Cloudflare Access should prompt for authentication
   - After authenticating, the Coati homepage should load
4. Test GitHub OAuth: click "Sign in with GitHub" — should redirect and return correctly

---

## 7. Seeding Mock Data

### Run the seed script

The seed script populates the test database with mock data. You can trigger it via the GitHub Actions workflow:

1. Go to GitHub → Actions → "Seed Dev Database" workflow
2. Click "Run workflow"
3. Select `develop` branch
4. Click "Run workflow"

The workflow SSHs into the VPS and runs `docker exec` on the Coolify app container to execute the seed script. The seed script and its dependencies are included in the Docker image.

### What the seed script creates

- **~30-45 users**: Real GitHub profiles with actual avatars and bios fetched from the GitHub API
- **~90-150 setups**: Distributed across all component types, with varying file counts, tags, and agents
- **Stars**: Randomly distributed, with some setups being highly starred (trending) and others with zero
- **Follows**: A social graph between users
- **Comments**: Including threaded replies on various setups
- **Activity feed**: Entries for recent actions
- **Edge cases**: Setups with no files, users with no setups, very long descriptions, maximum tags

### Seed script rate limits

The seed script fetches real GitHub profiles. Unauthenticated GitHub API requests are limited to 60/hour. Set a `GITHUB_TOKEN` env var to raise the limit to 5,000/hour:

```bash
GITHUB_TOKEN=ghp_xxxx pnpm run seed:dev
```

---

## 8. Test CLI Setup

The CLI is tested locally against `develop.coati.sh` — no npm registry publishing required. Each playground directory has a `coati-test` script that runs the CLI source code with the API base pointed at the test environment.

### Using the playground scripts

From any playground directory (e.g., `playground/clean`):

```bash
# Clone a setup from the test environment
pnpm coati-test clone owner/setup-slug

# Publish the current directory to the test environment
pnpm coati-test publish

# Login via GitHub Device Flow against the test environment
pnpm coati-test login

# Any other CLI command works the same way
pnpm coati-test init
```

### Using the `--staging` flag directly

From the `cli/` directory, you can use the `--staging` flag:

```bash
cd cli
pnpm dev -- --staging clone owner/setup-slug
pnpm dev -- --staging search claude
```

### Other API target options

The CLI supports several ways to override the API base:

| Method                         | Target             | Usage                                                                |
| ------------------------------ | ------------------ | -------------------------------------------------------------------- |
| `pnpm coati-test` (playground) | `develop.coati.sh` | `pnpm coati-test clone owner/slug`                                   |
| `--staging` flag               | `develop.coati.sh` | `pnpm dev -- --staging clone owner/slug`                             |
| `--dev` flag                   | `localhost:5173`   | `pnpm dev -- --dev clone owner/slug`                                 |
| `--api-base` flag              | any URL            | `pnpm dev -- --api-base https://example.com/api/v1 clone owner/slug` |
| `COATI_API_BASE` env var       | any URL            | `COATI_API_BASE=https://... pnpm dev -- clone owner/slug`            |

### Configure Cloudflare Access credentials

If the test environment is behind Cloudflare Access, the CLI needs the service token to reach the API. Manually edit `~/.coati/config.json`:

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
cd playground/clean
pnpm coati-test search claude
# Should return setups from the seeded test data
```

---

## 9. CI/CD Pipeline Reference

### Deploy (Coolify)

**Triggers**: Push to `develop` branch (automatic via Coolify GitHub App webhook)

**Steps** (handled automatically by Coolify):

1. Pull latest code from `develop` branch
2. Build Docker image using `Dockerfile`
3. Start new container with environment variables
4. Run database migrations (via `docker-entrypoint.sh`)
5. Healthcheck passes → old container removed (zero-downtime rolling update)

### Test CLI

The CLI is tested locally — no registry publishing needed. See [Test CLI Setup](#8-test-cli-setup) for details. Each `playground/` directory has a `coati-test` script that runs the CLI source against `develop.coati.sh`.

### Seed Dev Database (`.github/workflows/seed-dev.yml`)

**Triggers**: Manual (workflow_dispatch) only

**Steps**: SSHs into VPS → finds the running Coolify app container → runs `docker exec npx tsx scripts/seed-dev.ts` inside it.

---

## 10. Day-to-Day Operations

### Deploying changes

Push to `develop`. Coolify auto-deploys via the GitHub App webhook. You can also manually trigger a deploy in the Coolify dashboard.

### Checking server health

- **Coolify dashboard**: Shows container status, resource usage, and deployment history at `https://coolify.coati.sh`
- **Application logs**: Available in Coolify → App → Logs tab
- **Health endpoint**: `curl https://develop.coati.sh/api/v1/health`

### Running migrations manually

Migrations run automatically on every deploy via `docker-entrypoint.sh`. To run manually, use the **Terminal** tab in Coolify's app resource to open a shell in the running container:

```bash
npx drizzle-kit migrate
```

### Restarting the app

In Coolify dashboard → App → click **Restart**.

### Rolling back

In Coolify dashboard → App → **Rollback** tab — select a previous deployment to roll back to.

---

## 11. Troubleshooting

### "502 Bad Gateway" on develop.coati.sh

The container isn't running or isn't healthy.

1. Check Coolify dashboard → App → is the container running?
2. Check **Logs** tab for startup errors
3. Try **Restart** or **Redeploy**

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
# Should return { "data": { "status": "ok", ... } }
```

If the service token expired, create a new one in Cloudflare Zero Trust and update your config.

### Database connection errors

1. In Coolify, check that the PostgreSQL resource is running
2. Verify the `DATABASE_URL` environment variable in the app matches the database's **Postgres URL (internal)**
3. Both containers must be on the same Coolify network (this is automatic when created in the same project/environment)

### Build fails in Coolify

1. Check deployment logs in Coolify → App → Deployments → click the failed deployment
2. Common issues:
   - `pnpm-lock.yaml` out of sync → run `pnpm install` locally and push the updated lockfile
   - Missing environment variable at build time → the `Dockerfile` provides placeholder build-time values; if a new `$env/static/*` import is added, update the `Dockerfile`'s build-time `ENV` block
