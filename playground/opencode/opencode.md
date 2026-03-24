# opencode.md — My TypeScript App

## Project Overview

A lightweight Express REST API built with TypeScript. The app serves as a task
management backend with CRUD endpoints, input validation, and structured error
handling. Designed for deployment behind a reverse proxy (Caddy or nginx).

## Tech Stack

- **Runtime:** Node.js 22+ (ESM)
- **Language:** TypeScript 5.5+ (strict mode)
- **Framework:** Express 4.x
- **Testing:** Vitest
- **Linting:** ESLint 9 (flat config)

## Architecture

```
src/
  index.ts          # Server bootstrap and graceful shutdown
  app.ts            # Express app factory (no side effects)
  routes/           # Route handlers grouped by resource
    tasks.ts
    health.ts
  middleware/        # Custom middleware (auth, error handler, validation)
    errorHandler.ts
    validate.ts
  services/         # Business logic, decoupled from HTTP layer
    taskService.ts
  types/            # Shared TypeScript types and interfaces
    index.ts
  utils/            # Pure helper functions
    logger.ts
```

## Coding Conventions

- Use `const` by default; use `let` only when reassignment is required.
- Prefer named exports over default exports.
- All functions must have explicit return types — no inferred returns on exports.
- Use `interface` for object shapes, `type` for unions and intersections.
- Error responses follow the shape `{ error: string; code: string }`.
- Success responses follow the shape `{ data: T }`.
- No classes unless modeling stateful resources; prefer plain functions.
- Keep files under 150 lines. If a file grows beyond that, split it.

## Testing Patterns

- Test files live next to the source file: `taskService.ts` -> `taskService.test.ts`.
- Use `describe` / `it` blocks. Name tests as sentences: `it("returns 404 when task not found")`.
- Prefer integration tests for route handlers (use `supertest`).
- Prefer unit tests for services and utilities.
- Mock external dependencies at the module boundary, not deep internals.
- Every bug fix must include a regression test.

## Shell Commands

These commands are safe to run at any time:

- `npm run build` — compile TypeScript
- `npm run test` — run full test suite
- `npm run lint` — check for lint errors
- `npx vitest run src/services/` — run tests for a specific directory

## Do

- Validate all request inputs at the route handler level.
- Return early from functions when preconditions fail.
- Use `unknown` instead of `any` when the type is genuinely unknown.
- Write JSDoc comments on public service functions.
- Handle promise rejections — never leave a floating promise.

## Don't

- Don't use `any` — use `unknown` and narrow with type guards.
- Don't import from `node:*` without the `node:` prefix.
- Don't mutate function arguments.
- Don't use synchronous filesystem calls in request handlers.
- Don't add new dependencies without discussing the trade-off first.
- Don't commit `.env` files or secrets of any kind.
