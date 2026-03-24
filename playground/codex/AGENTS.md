# AGENTS.md — My TypeScript App

## Project Overview

A lightweight Express API server written in TypeScript. The app exposes a
RESTful JSON API for managing tasks and users. It is designed to be small,
well-tested, and easy to deploy as a Docker container.

## Tech Stack

- **Runtime:** Node.js 22 (ESM)
- **Language:** TypeScript 5.5+ (strict mode)
- **Framework:** Express 4
- **Testing:** Vitest (unit + integration)
- **Linting:** ESLint 9 flat config

## Project Structure

```
src/
├── index.ts          # Server bootstrap and graceful shutdown
├── app.ts            # Express app factory (no listen call)
├── routes/           # Route handlers grouped by domain
│   ├── tasks.ts
│   └── users.ts
├── middleware/        # Auth, validation, error handling
│   ├── auth.ts
│   ├── validate.ts
│   └── errorHandler.ts
├── services/         # Business logic (no HTTP concerns)
│   ├── taskService.ts
│   └── userService.ts
├── db/               # Database access layer
│   └── client.ts
└── types/            # Shared TypeScript interfaces
    └── index.ts
```

## Coding Conventions

- Use `const` by default; use `let` only when reassignment is necessary.
- Prefer named exports over default exports.
- All functions must have explicit return types.
- Use Zod for runtime validation of request bodies and query params.
- Route handlers should be thin — delegate logic to service functions.
- Never throw raw strings; always throw `Error` objects or custom error classes.
- Keep files under 150 lines. If a file grows larger, split it.

## API Response Format

All endpoints return a consistent envelope:

- Success: `{ "data": T }`
- Error: `{ "error": "Human-readable message", "code": "MACHINE_CODE" }`

## Testing Patterns

- Test files live next to source files: `taskService.test.ts` beside `taskService.ts`.
- Use `describe` / `it` blocks; name tests as sentences ("it returns 404 when task not found").
- Integration tests use `supertest` against the Express app factory.
- Never mock the database in integration tests — use a test database.
- Unit tests should mock external dependencies using `vi.mock()`.

## Do

- Run `pnpm lint` before considering any code change complete.
- Write or update tests whenever you change business logic.
- Use async/await consistently; never mix callbacks and promises.

## Don't

- Don't install new dependencies without explaining why.
- Don't use `any` — use `unknown` and narrow with type guards.
- Don't write SQL strings directly; use the query builder in `db/client.ts`.
- Don't commit `.env` files or secrets.
