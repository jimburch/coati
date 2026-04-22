# Contributing to Coati

Thanks for your interest in contributing! This document covers how to report issues, submit pull requests, and work with the project's automation.

If you're looking for an overview of the project or how to self-host, start with the [README](./README.md).

## Code of Conduct

By participating in this project you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). In short: be kind, assume good intent, and help keep the community welcoming.

## Reporting issues

Before opening an issue, please [search existing issues](https://github.com/jimburch/coati/issues?q=is%3Aissue) to avoid duplicates.

When opening an issue, include:

- **What happened** — the actual behavior you observed
- **What you expected** — what you thought should happen instead
- **Steps to reproduce** — ideally a minimal list another person can follow
- **Environment** — OS, Node version, pnpm version, browser (if relevant), and whether you're on the hosted instance or self-hosted

For security issues, please **do not** open a public issue — email `jim@showit.com` instead.

## Proposing changes

For small fixes (typos, clear bugs, doc updates), feel free to open a PR directly.

For larger changes (new features, architectural shifts, API surface changes), please open an issue first to discuss the approach before investing time. This saves everyone from PRs that need to be rewritten or closed.

## Development setup

See the [Development section of the README](./README.md#development) for prerequisites and setup. The short version:

```sh
pnpm install
cp .env.example .env    # fill in GitHub OAuth credentials
pnpm db:up
pnpm db:migrate
pnpm dev
```

## Submitting a pull request

1. Fork the repo
2. Create a branch from `develop` (PRs target `develop`, not `main`)
3. Make your changes — keep them focused; one logical change per PR
4. Run the full CI pipeline locally: `pnpm ci:checks` (runs `check`, `lint`, and `test:unit`)
5. If your change touches the UI, verify it visually at both desktop (1280x720) and mobile (430x932) viewports — the README explains the screenshot workflow
6. Open a PR against `develop` using the PR template
7. Respond to review feedback; maintainers may push small fixups directly to your branch if you allow edits from maintainers

CI must be green before a PR can be merged.

## Coding conventions

The project enforces a consistent style via ESLint and Prettier (`pnpm lint`, `pnpm format`). Beyond tooling:

- **TypeScript strict mode** everywhere
- **`const` over `let`**; never `var`
- **Drizzle query builder** over raw SQL (unless there's a performance reason, and document it)
- **API responses** follow `{ data }` on success / `{ error, code }` on failure
- **Validation** uses Zod schemas from `packages/validation` — share schemas between client and server
- **UI** uses shadcn-svelte primitives; don't add new UI libraries
- **Domain terms** — use the canonical terms from [`docs/UBIQUITOUS_LANGUAGE.md`](docs/UBIQUITOUS_LANGUAGE.md) (say **Setup** not "workflow", **Agent** not "tool", **Clone** not "download")
- **Small components** — one component per file; prefer composition over deep nesting

See [`CLAUDE.md`](CLAUDE.md) for the complete conventions. It's written for AI coding agents but is accurate for humans too.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add team invite acceptance flow
fix(feed): prevent duplicate keys on load-more pagination
chore(deps): bump drizzle-orm to 0.35
docs: update env variable table
```

`semantic-release` uses these to generate changelogs and version bumps on `develop` and `main`, so please follow the convention. If your PR contains multiple logical changes, consider splitting them or use a single summary commit.

## Tests

- **Unit / component tests** — Vitest. Colocate tests with source files (`foo.ts` → `foo.test.ts`).
- **E2e tests** — Playwright. Colocate with routes and match `**/*.e2e.{ts,js}`. The runner executes against both desktop and mobile projects.
- New features should include tests. Bug fixes should include a regression test that fails without the fix.
- Run `pnpm test:unit` during development and `pnpm test:e2e` before opening a PR for UI-facing changes.

## Issue labels and the worker system

Coati uses an autonomous worker system ("Ralph") to pick up labeled issues. As a contributor, you may encounter these labels:

- **`ralph`** — queued for the automated worker. If you'd rather pick one up yourself, **comment on the issue** so nobody duplicates the work, then a maintainer will remove the `ralph` label.
- **`AFK`** — a sub-classification of `ralph`: safe to run fully autonomously
- **`HITL`** (human-in-the-loop) — tasks the worker either couldn't finish or that explicitly need manual review. These are a great place to contribute.
- **`good first issue`** — scoped starter tasks
- **`priority:{low,medium,high}`** — maintainer-set priority

Only maintainers dispatch the worker. You don't need to run `pnpm dispatch` yourself.

## Documentation

- User-facing docs live in [`docs/`](docs/). If your change affects deployment, the data model, auth, or the CLI surface, please update the relevant doc in the same PR.
- README env-variable and command tables should stay in sync with `.env.example` and `package.json` scripts.

## Releases

Releases are automated via `semantic-release` on merges to `main`. You don't need to bump versions, update changelogs, or tag releases manually — Conventional Commit messages drive all of that.

## Questions?

Open a [Discussion](https://github.com/jimburch/coati/discussions) or file an issue. Thanks for contributing!
