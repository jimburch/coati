# Auth Architecture

Magpie uses the **Copenhagen Book** approach — lightweight custom session management with `node:crypto` — plus **Arctic** for GitHub OAuth.

## Session Management

- **Token generation:** 32 random bytes → 64-char hex string (`crypto.randomBytes`)
- **Storage:** SHA-256 hash of token stored as session ID in DB (raw token never stored)
- **Validation:** Hash incoming token, look up hash in `sessions` table, join with `users`
- **Lifetime:** 30 days with sliding window — if < 15 days remaining, extends to 30 days from now
- **Cookie:** `magpie_session`, httpOnly, secure, sameSite=lax, path=/

### Why hash tokens?

If the sessions table leaks, raw tokens remain safe. The attacker gets hashes, not usable session tokens.

## Web Auth Flow (GitHub OAuth)

1. `GET /auth/login/github` — generates CSRF `state`, stores in cookie, redirects to GitHub
2. GitHub redirects to `GET /auth/callback/github` with `code` + `state`
3. Server validates `state` matches cookie (CSRF check)
4. Exchanges `code` for access token via `github.validateAuthorizationCode()`
5. Calls `upsertGithubUser()` — fetches GitHub profile + emails, creates/updates user
6. Creates session token, stores hashed version, sets cookie
7. Redirects to `/`

### Logout

`POST /auth/logout` — invalidates session in DB, deletes cookie. POST-only to prevent CSRF logout attacks.

## CLI Auth Flow (GitHub Device Flow)

The CLI never talks to GitHub directly — Magpie proxies the device flow to keep Client ID server-side.

1. CLI calls `POST /api/v1/auth/device`
2. Server requests device code from GitHub, generates its own `deviceCode` for polling
3. Returns `{ deviceCode, userCode, verificationUri }` to CLI
4. CLI displays the user code, tells user to visit the verification URI
5. CLI polls `POST /api/v1/auth/device/poll` with `{ deviceCode }`
6. Server polls GitHub with the stored `githubDeviceCode`
7. When GitHub returns an access token, server upserts user, creates session, returns `{ token }`
8. CLI stores token locally at `~/.magpie/config.json`
9. CLI sends token as `Authorization: Bearer <token>` on subsequent API requests

## Request Hook (`hooks.server.ts`)

Runs on every request:
1. Reads `magpie_session` cookie (web) or `Authorization: Bearer <token>` header (CLI)
2. Cookie takes precedence if both present
3. Calls `validateSessionToken()` → populates `event.locals.user` and `event.locals.session`
4. Refreshes cookie maxAge if session was extended (sliding window)
5. Deletes invalid cookies

## Auth Guards (`guards.ts`)

| Guard | Use case | Failure behavior |
|-------|----------|-----------------|
| `requireAuth(event)` | Page loads | Redirects to `/auth/login/github` |
| `requireApiAuth(event)` | API routes | Returns 401 JSON |
| `requireAdmin(event)` | Admin API routes | Returns 401 or 403 JSON |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/auth.ts` | Session CRUD, cookie helpers, GitHub user upsert, Arctic provider |
| `src/hooks.server.ts` | Request-level session validation |
| `src/lib/server/guards.ts` | Auth guard utilities |
| `src/routes/auth/login/github/+server.ts` | OAuth login initiation |
| `src/routes/auth/callback/github/+server.ts` | OAuth callback |
| `src/routes/auth/logout/+server.ts` | Logout |
| `src/routes/api/v1/auth/device/+server.ts` | Device flow initiation |
| `src/routes/api/v1/auth/device/poll/+server.ts` | Device flow polling |

## Environment Variables

```
GITHUB_CLIENT_ID=     # GitHub OAuth App client ID
GITHUB_CLIENT_SECRET= # GitHub OAuth App client secret
```
