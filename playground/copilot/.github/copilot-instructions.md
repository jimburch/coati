# Copilot Instructions — my-typescript-app

## Project Overview

This is an Express-based REST API written in TypeScript. It follows a layered
architecture: routes -> controllers -> services -> repositories. The entry point
is `src/index.ts` and the app is exported from `src/app.ts` for testability.

## Architecture

- **Routes** (`src/routes/`) define URL paths and HTTP methods. They call controllers.
- **Controllers** (`src/controllers/`) parse request params/body, call services, and return responses.
- **Services** (`src/services/`) contain business logic. They are framework-agnostic and never import Express types.
- **Repositories** (`src/repositories/`) handle data access. In production this uses PostgreSQL; tests use an in-memory store.

## Coding Conventions

- Use `const` by default. Use `let` only when reassignment is necessary. Never use `var`.
- Prefer `async/await` over `.then()` chains.
- All functions must have explicit return types. Do not rely on type inference for function signatures.
- Use named exports, not default exports.
- Prefer `interface` over `type` for object shapes. Use `type` for unions, intersections, and mapped types.
- Destructure function parameters when there are more than two fields.
- Use `readonly` on properties that should not be mutated after construction.
- String interpolation with template literals over string concatenation.

## Error Handling

- All async route handlers must be wrapped with the `asyncHandler` utility from `src/middleware/async-handler.ts`.
- Services throw custom error classes from `src/errors/` (e.g., `NotFoundError`, `ValidationError`).
- The global error handler in `src/middleware/error-handler.ts` maps error classes to HTTP status codes.
- Never swallow errors silently. If you catch, either re-throw or log with context.

## Testing

- Use Vitest for all tests. Test files live next to the code they test with a `.test.ts` suffix.
- Unit tests should mock the layer below (e.g., service tests mock repositories).
- Use `describe` blocks grouped by method/function name.
- Each `it` block should test one behavior and have a descriptive name starting with "should".
- Prefer `expect(...).toEqual()` over `toBe()` for objects and arrays.
- Integration tests in `src/__tests__/` use `supertest` against the Express app.

## Preferred Libraries

- **Validation**: Zod (not Joi, not Yup)
- **HTTP client**: fetch (native, not axios)
- **Logging**: pino
- **Date handling**: Temporal API or `date-fns` (not moment.js)
- **UUID**: `crypto.randomUUID()` (not the uuid package)

## Do Not

- Do not use `any` type. Use `unknown` and narrow with type guards.
- Do not import from `node:` prefixed modules without the prefix (always use `node:fs`, not `fs`).
- Do not use classes for services or repositories. Use plain functions and closures.
- Do not add new dependencies without discussing in a PR comment first.
- Do not use `console.log` in production code. Use the pino logger.
- Do not write SQL strings directly. Use the query builder or parameterized queries.
