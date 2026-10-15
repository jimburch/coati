# Ledger — Task-Level Copilot Instructions

These instructions layer on top of `../copilot-instructions.md`. The repo-wide
file defines *what the project is*; this file defines *how to approach tasks*.

## Task hygiene

- Ask for the linked GitHub issue or Linear ticket before starting non-trivial work. If the user cannot point to one, offer to create one.
- Start by stating the plan in 3–5 bullets and asking for confirmation. Do not begin editing until the user agrees.
- Scope changes to the task — do not refactor adjacent code opportunistically.
- Commits are small and atomic. One behavior change per commit.

## File navigation

- Use `grep` and `find` to locate call sites before editing a shared utility.
- When adding a new tRPC procedure, search for an existing one in the same router for the template.
- When adding a new Prisma model, search the schema for the closest analogue for naming and relation conventions.

## Edits

- Prefer the smallest diff that solves the problem.
- Do not change imports that are unrelated to the change.
- Do not reformat files you did not intend to edit.
- Run `pnpm check` after every non-trivial edit and before declaring done.

## Tests

- Every bug fix needs a regression test that fails on the old code.
- Every new tRPC procedure needs at least a happy-path test and an unauthorized-access test.
- Run `pnpm test:unit` before declaring a task complete.

## Pull requests

- PR title uses Conventional Commits: `feat(expenses): …`, `fix(reports): …`
- PR body explains the *why* in one paragraph, then the *what* as a bulleted list of notable changes.
- Link the issue in the body: `Closes #123`.
