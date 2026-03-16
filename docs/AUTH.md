# Auth Architecture

Magpie uses **GitHub OAuth** as its sole authentication method, with the **Copenhagen Book** approach for lightweight custom session management (`node:crypto`) and **Arctic** for the OAuth flow.

---

## Session Management

- **Token generation:** 32 random bytes -> 64-char hex string (`crypto.randomBytes`)
- **Storage:** SHA-256 hash of token stored as session ID in DB (raw token never stored)
- **Validation:** Hash incoming token, look up hash in `sessions` table, join with `users`
- **Lifetime:** 30 days with sliding window — if < 15 days remaining, extends to 30 days from now
- **Cookie:** `magpie_session`, httpOnly, secure, sameSite=lax, path=/

### Why hash tokens?

If the sessions table leaks, raw tokens remain safe. The attacker gets hashes, not usable session tokens.

---

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

---

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

---

## Request Hook (`hooks.server.ts`)

Runs on every request:

1. Reads `magpie_session` cookie (web) or `Authorization: Bearer <token>` header (CLI)
2. Cookie takes precedence if both present
3. Calls `validateSessionToken()` -> populates `event.locals.user` and `event.locals.session`
4. Refreshes cookie maxAge if session was extended (sliding window)
5. Deletes invalid cookies

---

## Auth Guards (`guards.ts`)

| Guard                   | Use case         | Failure behavior                  |
| ----------------------- | ---------------- | --------------------------------- |
| `requireAuth(event)`    | Page loads       | Redirects to `/auth/login/github` |
| `requireApiAuth(event)` | API routes       | Returns 401 JSON                  |
| `requireAdmin(event)`   | Admin API routes | Returns 401 or 403 JSON           |

---

## Key Files

| File                                            | Purpose                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `src/lib/server/auth.ts`                        | Session CRUD, cookie helpers, GitHub user upsert, Arctic provider |
| `src/hooks.server.ts`                           | Request-level session validation                                  |
| `src/lib/server/guards.ts`                      | Auth guard utilities                                              |
| `src/routes/auth/login/github/+server.ts`       | OAuth login initiation                                            |
| `src/routes/auth/callback/github/+server.ts`    | OAuth callback                                                    |
| `src/routes/auth/logout/+server.ts`             | Logout                                                            |
| `src/routes/api/v1/auth/device/+server.ts`      | Device flow initiation                                            |
| `src/routes/api/v1/auth/device/poll/+server.ts` | Device flow polling                                               |

---

## Environment Variables

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## Provider Setup Instructions

### GitHub OAuth App

GitHub requires a separate OAuth App per environment (callback URLs can't mix localhost and production domains).

#### Development (localhost)

1. Go to [github.com/settings/developers](https://github.com/settings/developers) -> **OAuth Apps** -> **New OAuth App**
2. Fill in:
   - **Application name:** `Magpie Dev`
   - **Homepage URL:** `http://localhost:5173`
   - **Authorization callback URL:** `http://localhost:5173/auth/callback/github`
3. Click **Register application**
4. Copy the **Client ID** -> set as `GITHUB_CLIENT_ID` in `.env`
5. Click **Generate a new client secret** -> copy immediately -> set as `GITHUB_CLIENT_SECRET` in `.env`

#### Testing / Staging

If you run a staging environment (e.g. `staging.magpie.dev`):

1. Create another OAuth App named `Magpie Staging`
2. **Homepage URL:** `https://staging.magpie.dev`
3. **Authorization callback URL:** `https://staging.magpie.dev/auth/callback/github`
4. Set the credentials in the staging environment's variables

#### Production

1. Create another OAuth App named `Magpie`
2. **Homepage URL:** `https://magpie.dev` (or your production domain)
3. **Authorization callback URL:** `https://magpie.dev/auth/callback/github`
4. Set the credentials in the production environment's variables

> **Tip:** For the Device Flow (CLI auth), GitHub OAuth Apps support it by default. No extra configuration needed — the same Client ID works for both web and device flows.

---

## Security Considerations

- **Timing-safe comparison:** Use `crypto.timingSafeEqual` when comparing token hashes to prevent timing attacks
- **Rate limiting:** Planned for auth endpoints (not in initial implementation)
- **CSRF protection:** OAuth `state` parameter validated on callback; logout is POST-only

---

## Task List

### External Service Setup (you)

- [ ] **GitHub OAuth App (dev)** — create at github.com/settings/developers, set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env` (see [Provider Setup: GitHub](#github-oauth-app))
- [ ] **GitHub OAuth App (staging)** — create with staging domain and callback URL (when ready)
- [ ] **GitHub OAuth App (production)** — create with production domain and callback URL (when ready)

### Codebase Tasks

- [x] Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set in `.env`
- [x] Test GitHub OAuth web flow: click "Sign in with GitHub" -> authorize -> redirected back, session created
- [x] Test returning user: sign in again -> same account, profile fields updated
- [x] Test logout: `POST /auth/logout` -> session invalidated, cookie deleted
- [x] Test CLI device flow: `POST /api/v1/auth/device` -> poll -> token returned
- [x] Test auth guards: unauthenticated request to protected page -> redirect to `/auth/login/github`
- [x] Test API auth guard: unauthenticated request to API -> 401 JSON response
- [x] Test `Authorization: Bearer <token>` header works for API routes
- [x] Run `pnpm check` — 0 type errors
- [x] Run `pnpm build` — builds successfully
