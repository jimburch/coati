# Security Audit Fixes

## Problem Statement

A scoped security review of the Coati platform (web + CLI) identified four concrete vulnerabilities across the auth, CLI, and infrastructure surfaces. Two are HIGH severity (directly exploitable today), and two are MEDIUM (defense-in-depth gaps with real attack paths). The platform is not yet fully deployed, so fixing these before launch is the right window — no backward-compatibility constraints, no old CLI clients in the wild.

The findings:

- **H1 — Open redirect in OAuth login.** The `?redirect=` param on `/auth/login/github` validates only `startsWith('/')`, which accepts protocol-relative URLs like `//evil.com/path`. An attacker can send a legitimate-looking Coati login link that authenticates the victim on the real domain, then silently redirects them to an attacker-controlled phishing page.
- **H2 — Arbitrary file write / zip-slip in `coati clone`.** The CLI writes server-returned files to disk using `path.resolve(projectDir, filePath)` / `path.join(homedir, filePath)` with no containment check. A malicious publisher can include a file with `path: "../../../.ssh/authorized_keys"` and have it written to any victim's home directory during `coati clone`.
- **M1 — Dockerfile runtime runs as root.** The runtime stage has no `USER` directive, so the app runs as root in-container. Any RCE in a dependency (markdown, TLS, file parsing) becomes root-in-container, expanding blast radius.
- **M2 — Clone identifier segments not URL-encoded.** The CLI interpolates parsed `owner`/`slug` segments raw into API URLs. With no charset validation, odd characters (`?`, `#`, `..`) alter URL structure. Defense-in-depth gap.

## Solution

Ship four targeted, self-contained fixes before deploy:

- **H1:** Tighten the `redirectTo` validation at write time on `/auth/login/github` and re-validate on read at the callback, rejecting protocol-relative URLs and backslash-escape variants.
- **H2:** Enforce path containment at two layers — **server-side** in the publish/file-ingestion Zod schema (so malicious paths never persist), and **CLI-side** at clone write time (so any future server bypass or stale data can't harm the user). On CLI violation, hard-reject the entire clone with a clear error message rather than partial-writing. Also refuse to write through pre-existing symlinks.
- **M1:** Add a non-root user to the Dockerfile runtime stage and verify Coolify's entrypoint still functions.
- **M2:** Add a strict slug regex to `parseCloneIdentifier` and use `encodeURIComponent` when building API URLs in the CLI HTTP client.

## User Stories

1. As a Coati user clicking a login link on social media, I want to be sure that after authenticating I land on a real Coati page, so that I am not tricked into re-entering my GitHub credentials on a phishing site.
2. As a Coati user cloning a setup, I want the CLI to refuse to write files outside my current project directory, so that a malicious setup cannot overwrite my SSH keys, shell RC files, or cron jobs.
3. As a Coati user cloning a global setup, I want the CLI to refuse to write files outside my home directory, so that a malicious setup cannot write to `/etc`, `/usr/local`, or other system paths.
4. As a Coati user cloning a setup, I want the CLI to stop and show a clear error if any file path in the setup is unsafe, so that I know what happened and no partial state is left on disk.
5. As a Coati user cloning a setup, I want the CLI to refuse to overwrite existing symlinks, so that a pre-existing symlink in my project cannot be used to redirect a write to a sensitive system file.
6. As a Coati setup publisher, I want the server to reject publish attempts containing unsafe file paths, so that my setup cannot accidentally harm anyone who clones it and so I see the error immediately at publish time.
7. As a Coati setup publisher, I want a clear validation error message explaining which file path was rejected and why, so that I can fix my manifest quickly.
8. As a platform operator, I want the server-side validator to be the canonical source of truth for "safe path" rules, so that every future client (CLI, web file viewer, any third-party tool) gets the same protection automatically.
9. As a Coati user running the CLI, I want `coati clone user/weird?slug` to be rejected at parse time, so that invalid slugs don't cause unexpected behavior against the API.
10. As a Coati user running the CLI, I want slug parsing to enforce `[a-z0-9][a-z0-9-]*`, so that only well-formed identifiers ever reach the server.
11. As a platform operator, I want the production container to run as a non-root user, so that an RCE in a dependency cannot directly modify the application image or escalate via kernel vulnerabilities.
12. As a platform operator, I want the existing Coolify deploy to continue working after the non-root change, so that the security improvement does not introduce a deploy regression.
13. As a maintainer, I want regression tests around each fix, so that a future refactor cannot silently reintroduce any of these vulnerabilities.
14. As a security reviewer, I want each fix to be small, focused, and independently verifiable, so that the PR is easy to review and land before launch.

## Implementation Decisions

### Scope

- Single PRD bundling all four findings. They ship together as "pre-launch security hardening."
- No backward-compatibility constraints — we have no production traffic or deployed CLI clients yet.

### H1 — Open redirect

- **Modules touched:** web auth login handler, web auth callback handler.
- **Validation rule:** `redirectTo` must be a string matching `^\/(?![/\\])` — starts with exactly one `/`, and the next char is not `/` or `\`. This blocks `//evil.com`, `/\evil.com`, and absolute URLs.
- **Extract a deep module:** introduce a small pure function `isSafeInternalRedirect(value: string): boolean` that encapsulates the rule. Both the login handler (write-time validation before setting the cookie) and the callback handler (read-time validation before passing to `redirect()`) call it. The function has no dependencies, returns boolean, and is trivially testable.
- **On invalid value:** silently fall back to `/` (do not error). Matches current behavior where an absent `redirect` param also falls back to `/`.

### H2 — Path containment (server + CLI)

- **Modules touched:**
  - Server-side Zod validation for `createSetupFileSchema` (or wherever publish accepts file paths).
  - CLI `resolveTargetPath` / `writeSetupFiles` (clone write path).
  - CLI Zod schema for the manifest's file list.
- **Extract a deep module (shared):** `isSafeRelativePath(pathStr: string): boolean`. Pure function. Rules:
  - Must be non-empty.
  - Must not be absolute (`path.isAbsolute` is false on posix and win32).
  - Must not contain `..` segments after `path.normalize` (checked via segment scan, not substring match).
  - Must not contain `\0` (null byte).
  - Must not start with `/` or `\`.
- Lives in `packages/shared-validation` so both server Zod and CLI Zod can import it.
- **Server behavior:** `createSetupFileSchema` calls `isSafeRelativePath` via a Zod `.refine`. Publish rejects the whole request with a 400 naming the offending path. No partial publish.
- **CLI behavior, pre-write:** after receiving files from the server, the CLI runs every file through `isSafeRelativePath` before any disk touch. On **any** violation, **hard-reject the entire clone** with an error listing the bad paths. No partial writes.
- **CLI behavior, write-time (defense-in-depth):** after `resolveTargetPath`, assert the resolved absolute path starts with the intended root (`projectDir + path.sep` or `homedir + path.sep`). If not, throw.
- **Symlink refusal:** before writing, `fs.lstatSync` the target. If it exists and is a symlink, refuse with an explicit error. This is cheap and closes the "pre-existing symlink in cwd" amplification path.
- **Error presentation:** a single consolidated error listing all rejected paths, not one-error-per-path spam.

### M1 — Non-root Dockerfile

- **Modules touched:** `Dockerfile` runtime stage only.
- Add a non-root `app` user/group, chown `/app`, set `USER app` before `CMD`.
- **Open question flagged by user:** ensure Coolify's entrypoint, migration step, and port binding still work as non-root. Port must be ≥1024 (already is — app listens on 3000). Migrations connect over network, not local FS, so no root needed. The entrypoint script must be executable by `app`.
- **Acceptance:** a full end-to-end Coolify deploy to a test environment succeeds and the app serves traffic.

### M2 — Clone identifier validation

- **Modules touched:** CLI `parseCloneIdentifier`, CLI HTTP client where paths are built.
- **Validation rule in parser:** each segment must match `^[a-z0-9][a-z0-9-]*$`.
- **Extract:** reuse the same `isValidSlug` regex/predicate already used elsewhere in the codebase if one exists; otherwise create one in `packages/shared-validation` so server and CLI share a single definition of "valid slug."
- **URL construction:** replace string interpolation of segments into paths with `encodeURIComponent(segment)` wherever clone URLs are built, as depth-in-depth even after regex validation.

### Cross-cutting

- All new validation predicates live in `packages/shared-validation` so server and CLI import the same source of truth.
- No new runtime dependencies.
- No schema changes.
- No API-contract changes (server just begins rejecting things it previously accepted, which is a stricter subset — safe given no deployed traffic).

## Testing Decisions

**Good-test principle:** each test asserts externally-observable behavior (rejection vs. acceptance, file written vs. not written, redirect target) — not internal implementation details (function-call order, private helpers). Tests should survive refactors of the fix.

**Modules to test:**

- `isSafeInternalRedirect` — unit tests covering `/foo` (accept), `/` (accept), `//evil.com` (reject), `/\evil.com` (reject), `http://evil.com` (reject), empty string (reject), `null`/`undefined` (reject), very long path (accept if `/`-prefixed).
- **Login handler integration:** given `?redirect=//evil.com`, the `oauth_redirect` cookie is not set.
- **Callback handler integration:** given an `oauth_redirect` cookie of `//evil.com`, the response 302s to `/` (not `//evil.com`).
- `isSafeRelativePath` — unit tests covering `foo.txt`, `dir/foo.txt`, `.foo`, `./foo` (depending on policy), `../foo` (reject), `foo/../bar` (reject), `/abs/foo` (reject), `C:\foo` (reject on posix tests too, to keep rule platform-consistent), `foo\x00bar` (reject), empty string (reject).
- **Server publish integration:** attempting to publish a setup with `{path: "../etc/passwd"}` returns 400 with a message naming the offending path; DB is unchanged.
- **CLI clone integration:** given a mock API returning a file with `path: "../../.ssh/authorized_keys"`, the CLI exits non-zero with an error listing the bad path; no files are written (verify target does not exist after run).
- **CLI clone symlink test:** create a project dir with a pre-existing symlink `config.json -> /tmp/sensitive`; clone a setup that writes `config.json`; CLI refuses to overwrite.
- `parseCloneIdentifier` — unit tests covering `user/setup` (accept), `user/weird?slug` (reject), `USER/setup` (reject — enforce lowercase), leading dash (reject), empty segment (reject, already covered).
- **CLI API URL construction:** after successful parse, the resulting URL is byte-equivalent to `encodeURIComponent(owner) + '/' + encodeURIComponent(slug)` (safe even if a future regex loosening allows a wider charset).
- **Dockerfile:** smoke test via a GitHub Actions workflow step (or local script) that builds the image, runs it, `docker exec` to check `whoami` returns `app`, and verifies the app binds to port 3000 successfully.

**Prior art in the codebase:**

- Existing Zod-based validation tests in `src/lib/types/validation.test.ts` and `packages/shared-validation/src/index.test.ts`.
- Existing CLI command-level tests in `cli/src/commands/*.test.ts` use mocked fs and HTTP, which fits the clone path-rejection tests directly.
- Existing e2e auth tests in `tests/auth.setup.ts` and `src/routes/**/*.auth.e2e.ts` cover the login/callback path and can be extended with a protocol-relative-redirect case.

## Out of Scope

- Session management UX improvements (per-device session list, revoke-a-device UI). Called out during the audit as a separate hardening opportunity; not a concrete vulnerability on its own.
- General CLI hardening beyond the two findings above (e.g., post-install hook confirmation UX, manifest schema tightening for non-path fields).
- Rate limiting, audit logging, or monitoring changes.
- Dependency upgrades — handled by a separate process.
- Any changes to the OAuth scopes, Lucia session configuration, or cookie attributes — these were reviewed and found correct.
- Web-surface file viewer rendering changes. The current DOMPurify-based markdown rendering was reviewed and is safe; no changes needed.

## Further Notes

- Fixes should ship as a single branch / PR so the security-hardening commit history is coherent for post-launch review.
- Because we have no deployed CLI clients, we do **not** need a minimum-CLI-version gate on the server. The server can start enforcing strict path validation immediately. Document this decision so we don't add the gate later out of habit.
- Recommended remediation order (for implementation): H2 first (largest user-harm risk) → H1 (trivial, weaponizable) → M1 (Coolify deploy verification has the longest feedback loop) → M2 (small addition alongside H2).
- For M1, run a full Coolify deploy to a test environment before merging to main. If the non-root change breaks the entrypoint, document the resolution in this file so it's captured for future debugging.
- All four fixes were verified by direct code inspection during the audit; the exploit paths described in the user stories are concrete, not theoretical.
