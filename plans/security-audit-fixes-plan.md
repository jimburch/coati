# Plan: Security Audit Fixes

> Source PRD: `plans/security-audit-fixes.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Shared validation package**: both new predicates (`isSafeRelativePath`, `isSafeInternalRedirect`) live in `packages/shared-validation` so the server Zod schemas and the CLI Zod schemas import a single source of truth. No duplicated rule definitions.
- **Validation rules**
  - `isSafeRelativePath(p)`: non-empty, not absolute (posix + win32), no `..` segments after normalize, no null byte, no `/` or `\` prefix.
  - `isSafeInternalRedirect(p)`: matches `^\/(?![/\\])` — one leading `/`, next char not `/` or `\`. On invalid, callers silently fall back to `/`.
- **Defense-in-depth posture**: server is the canonical enforcer. CLI re-validates on receive, and re-asserts containment post-`path.resolve` at write time. Both layers fail closed.
- **Failure mode**: hard-reject the whole operation on any violation — no partial publish, no partial clone. Error messages list every offending path at once.
- **No backward-compat shims**: platform is pre-launch, no deployed CLI clients, no minimum-CLI-version gate on the server. Strict rules apply from day one.
- **No API contract changes**: the server simply begins rejecting a stricter subset of inputs. Response shapes unchanged.
- **No schema or migration changes**.

---

## Phase 1: Server-side path containment

**User stories**: 6, 7, 8, 13, 14

### What to build

A thin vertical slice that extracts the shared `isSafeRelativePath` predicate and enforces it on the publish pipeline. After this phase, a publisher attempting to publish a setup containing `../etc/passwd` or `/abs/path.txt` receives a 400 response naming the offending path(s), and nothing persists to the database. The predicate is covered by unit tests; publish rejection is covered by an API-level integration test.

### Acceptance criteria

- [ ] `isSafeRelativePath` is exported from the shared validation package and covered by unit tests for all documented rules (non-empty, absolute, `..` segments, null byte, leading separators).
- [ ] The server-side file-ingestion Zod schema refines `path` through `isSafeRelativePath`.
- [ ] An integration test asserts that a publish request containing an unsafe path returns 400 with a message that identifies the offending path, and that no rows are written to the file-content table.
- [ ] Valid existing setups continue to publish without regression.
- [ ] Lint, typecheck, and unit test suite all green.

---

## Phase 2: CLI-side path containment and symlink refusal

**User stories**: 2, 3, 4, 5, 13, 14

### What to build

The CLI consumes the shared `isSafeRelativePath` predicate and enforces it on every file returned from the clone API **before** touching disk. On any violation, the clone exits non-zero with a consolidated error listing every rejected path; no files are written. After path-resolution, a post-resolve containment assertion verifies the absolute path still lives inside the intended root (project dir for project placement, home dir for global placement). Before writing a target that already exists, `fs.lstatSync` is checked — if the target is a symlink, the write is refused with an explicit error. Covers both project and global placements.

### Acceptance criteria

- [ ] The CLI clone command runs every received file's `path` through `isSafeRelativePath` before any filesystem operation.
- [ ] On any violation, the clone exits non-zero, prints a single consolidated error listing every bad path, and writes zero files.
- [ ] After `path.resolve` / `path.join`, the CLI asserts the result begins with the intended root + path separator and throws otherwise.
- [ ] Before writing, the CLI refuses to overwrite an existing symlink at the target.
- [ ] Integration tests (using a mocked API and a temp directory) cover: unsafe-path rejection, pre-existing-symlink refusal, normal clone continues to succeed, global-placement rejection of `..` escapes.
- [ ] Existing clone behavior for valid setups is unchanged.

---

## Phase 3: Open redirect fix

**User stories**: 1, 13, 14

### What to build

Extract `isSafeInternalRedirect` into the shared validation package. The web login handler uses it before setting the `oauth_redirect` cookie; the callback handler uses it again on read before passing to `redirect()`. Invalid values fall back to `/` silently, matching the current "no redirect param" behavior. Unit tests cover the predicate; end-to-end tests cover the full login flow with a protocol-relative redirect value.

### Acceptance criteria

- [ ] `isSafeInternalRedirect` is exported from the shared validation package with unit tests for `/foo`, `/`, `//evil.com`, `/\evil.com`, absolute URLs, empty string, and `null`/`undefined`.
- [ ] The login handler sets the `oauth_redirect` cookie only when the value passes `isSafeInternalRedirect`.
- [ ] The callback handler re-validates the cookie value and falls back to `/` if invalid.
- [ ] An end-to-end test exercises the login flow with `?redirect=//evil.com` and asserts the post-auth response redirects to `/`, not to an external origin.
- [ ] Valid internal redirects like `/explore` continue to work end-to-end.

---

## Phase 4: Clone identifier slug validation and URL encoding

**User stories**: 9, 10, 13, 14

### What to build

Strict slug regex enforcement in the CLI identifier parser: each segment must match `^[a-z0-9][a-z0-9-]*$`. Parse failures produce a clear error. As defense-in-depth even after regex validation, the CLI HTTP client uses `encodeURIComponent` when interpolating segments into API paths. If a shared `isValidSlug` predicate already exists in the codebase, reuse it; otherwise add it to the shared validation package.

### Acceptance criteria

- [ ] The identifier parser rejects segments that contain uppercase letters, leading dashes, empty strings, or any character outside `[a-z0-9-]`.
- [ ] Unit tests cover: `user/setup` accepted, `USER/setup` rejected, `user/weird?slug` rejected, `-leading/setup` rejected, empty segments rejected.
- [ ] The CLI HTTP client interpolates URL path segments via `encodeURIComponent`.
- [ ] Existing valid clone flows unchanged.
- [ ] Lint, typecheck, and unit test suite all green.

---

## Phase 5: Non-root runtime container

**User stories**: 11, 12

### What to build

Add a dedicated non-root `app` user and group to the Dockerfile runtime stage, chown `/app`, and set `USER app` before `CMD`. Verify the full Coolify deploy pipeline still works: migrations execute, the entrypoint script runs, the app binds to its port, Traefik routes traffic, and `docker exec … whoami` returns `app`. If Coolify's entrypoint requires root, document the resolution inline in the plan file.

### Acceptance criteria

- [ ] Dockerfile runtime stage defines an `app` user/group, chowns `/app`, and sets `USER app`.
- [ ] `docker build` succeeds with no warnings about permissions or missing files.
- [ ] A full Coolify deploy to a non-production environment completes successfully and the app serves traffic end-to-end.
- [ ] `docker exec <container> whoami` returns `app`.
- [ ] Migrations run successfully at startup from the non-root user.
- [ ] Any Coolify-specific adjustments required are documented in `plans/security-audit-fixes.md` under "Further Notes".
