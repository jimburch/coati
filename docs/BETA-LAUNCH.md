# Beta Launch Checklist

Production deploy of coati.sh in beta mode with CLI published to npm.

## Decisions

| Decision            | Outcome                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Environments        | `develop.coati.sh` (staging, deploys from `develop`) + `coati.sh` (production, deploys from `main`)               |
| Production database | Separate PostgreSQL instance in Coolify, no seed data                                                             |
| DNS                 | Swap `coati.sh` from Cloudflare Pages to VPS, keep Cloudflare proxying (orange cloud)                             |
| CI/CD               | Coolify watches `main` for auto-deploy; GitHub Actions runs checks only                                           |
| CLI package name    | `@coati/sh` on npm, binary name `coati`                                                                           |
| CLI versioning      | Independent from web app, auto-publish on push to `main` when `cli/` changes, conventional commits determine bump |
| npm auth            | Granular access token scoped to `@coati` org, stored as `NPM_TOKEN` GitHub Actions secret                         |
| Beta access         | Manual approval via admin panel; existing feedback widget + waitlist page are ready                               |
| Landing page        | Existing SvelteKit landing page replaces `/site` marketing page                                                   |
| Monitoring          | Coolify health checks only for now; add Sentry/uptime monitoring later                                            |
| Merge strategy      | All changes go through `develop` first, then merge to `main`                                                      |

## Production Environment Variables

| Variable                | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`          | Production PostgreSQL connection string                              |
| `GITHUB_CLIENT_ID`      | Production OAuth app (already created)                               |
| `GITHUB_CLIENT_SECRET`  | Production OAuth app (already created)                               |
| `PUBLIC_SITE_URL`       | `https://coati.sh`                                                   |
| `PUBLIC_BETA_MODE`      | `true`                                                               |
| `GITHUB_FEEDBACK_TOKEN` | Existing PAT (expires 2026-06-25, scoped to `jimburch/coati` issues) |

---

## Phase 0: Pre-work (on `develop`)

- [x] Add local dev database to Beekeeper Studio (connection string in `.env` → `DATABASE_URL`)
- [x] Add staging database to Beekeeper Studio (connection string from Coolify dev resource)
- [x] Verify beta mode on staging
  - [x] Set `PUBLIC_BETA_MODE=true` on `develop.coati.sh` Coolify resource
  - [x] Confirm unauthenticated users are redirected to login (except `/`, `/auth/*`, `/waitlist`)
  - [x] Confirm authenticated users without `is_beta_approved` are redirected to `/waitlist`
  - [x] Confirm admin users bypass the gate
  - [x] Confirm API routes (`/api/*`) are not gated
  - [x] Confirm feedback widget appears for approved/admin users
  - [x] Reset `PUBLIC_BETA_MODE=false` on staging when done testing
- [x] Test full migration chain on a clean database
  - [x] Start a fresh PostgreSQL instance (e.g., `docker run --rm -e POSTGRES_PASSWORD=test -p 5434:5432 postgres:17-alpine`)
  - [x] Point `DATABASE_URL` at it and run `pnpm db:migrate`
  - [x] Confirm all migrations apply without errors
  - [x] Tear down the test instance

## Phase 1: CLI Rename (on `develop`)

- [x] Update `cli/package.json`: change `name` from `coati` to `@coati/sh`
- [x] Update any references to the old package name (README, docs, etc.)
- [x] Verify CLI builds and tests pass: `cd cli && pnpm build && pnpm test`
- [ ] Push to `develop`, confirm CI passes

## Phase 2: CLI Publish Workflow

- [x] Manually publish `@coati/sh@0.1.0` to npm to create the package
- [x] Configure trusted publisher on npm (GitHub Actions OIDC, no token needed)
- [x] Create `.github/workflows/cli-release.yml`:
  - Triggers on push to `main` when `cli/**` files change
  - Determines version bump from conventional commits (fix → patch, feat → minor, breaking → major)
  - Bumps version in `cli/package.json`
  - Builds the CLI and publishes with `--provenance`
  - Tags release as `cli-v<version>` and pushes tag
- [ ] Push to `develop`, confirm CI passes

## Phase 3: Production Infrastructure

- [x] Create production PostgreSQL instance in Coolify
- [x] Create production Coolify resource
  - [x] Set source branch to `main`
  - [x] Set build pack to Dockerfile
  - [x] Configure all environment variables (see table above)
  - [x] Configure health check endpoint (`/api/v1/health`)
- [x] Set up Coolify GitHub App webhook to watch `main` for auto-deploy

## Phase 4: DNS Cutover

- [x] In Cloudflare, update `coati.sh` DNS from Cloudflare Pages to VPS IP (A record, proxied)
- [x] Remove or disable the Cloudflare Pages project for `coati.sh`
- [x] Verify SSL is working via Cloudflare proxy

## Phase 5: Go Live

- [ ] Merge `develop` into `main` (this triggers the first production deploy)
- [ ] Monitor Coolify build logs for successful deployment
- [ ] Verify the app is accessible at `https://coati.sh`
- [ ] Verify health check: `curl https://coati.sh/api/v1/health`
- [ ] Add production database to Beekeeper Studio
- [ ] Set yourself as admin: update `is_admin = true` in the `users` table via Beekeeper
- [ ] Verify admin panel is accessible at `/admin/beta`
- [ ] Verify beta gate is working:
  - [ ] Unauthenticated users see the landing page at `/` but get redirected to login for other routes
  - [ ] New signups land on `/waitlist`
  - [ ] Admin can approve users via `/admin/beta`

## Phase 6: Initial Content & CLI Publish

- [ ] Upload a few real setups to the platform
- [ ] Verify the first CLI publish to npm succeeded (triggered by the `main` merge)
- [ ] Test the CLI end-to-end: `npm i -g @coati/sh && coati login && coati search`
- [ ] If first publish didn't trigger (no `cli/` changes in merge), push a version bump to `develop` and merge

## Phase 7: Beta Testing

- [ ] Invite beta testers (they sign up via GitHub OAuth, land on waitlist)
- [ ] Approve testers via admin panel
- [ ] Monitor feedback via GitHub issues (created by feedback widget)

---

## Post-Beta (future)

- [ ] Add uptime monitoring (UptimeRobot / Better Uptime)
- [ ] Add error tracking (Sentry)
- [ ] Add analytics
- [ ] Rotate `GITHUB_FEEDBACK_TOKEN` before 2026-06-25 expiry
- [ ] Flip `PUBLIC_BETA_MODE=false` to open to public
- [ ] Remove `/site` marketing page if still around
