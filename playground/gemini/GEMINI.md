# GEMINI.md — My TypeScript App

## Project Overview

A lightweight Express-based REST API written in TypeScript. The app serves as a
task management backend with CRUD operations, input validation, and structured
error handling.

## Tech Stack

- **Runtime:** Node.js 22+ (ES modules)
- **Language:** TypeScript 5.5+ (strict mode)
- **Framework:** Express 4.x
- **Testing:** Vitest
- **Linting:** ESLint 9 (flat config)

## Project Structure

```
src/
├── index.ts          # Server entry point
├── routes/           # Express route handlers
│   ├── tasks.ts
│   └── health.ts
├── middleware/        # Custom middleware
│   ├── auth.ts
│   ├── validate.ts
│   └── errorHandler.ts
├── services/         # Business logic layer
│   └── taskService.ts
├── types/            # Shared TypeScript types
│   └── index.ts
└── utils/            # Helper functions
    ├── logger.ts
    └── config.ts
```

## Coding Conventions

- Use `const` by default; use `let` only when reassignment is necessary; never use `var`
- Prefer named exports over default exports
- All functions must have explicit return types
- Use `interface` for object shapes, `type` for unions and intersections
- Error responses follow `{ error: string, code: string }` format
- Success responses follow `{ data: T }` format
- Route handlers must be async and use try/catch with the error middleware
- Keep route handlers thin — delegate logic to service functions
- Validate all request bodies at the middleware layer before reaching handlers

## Testing Patterns

- Test files live next to source files: `taskService.test.ts` beside `taskService.ts`
- Use `describe` blocks grouped by function name
- Use `it` (not `test`) for individual test cases
- Mock external dependencies with `vi.mock()`
- Every service function needs at least: one happy-path test, one error-path test
- Run tests with `npm test` before considering any change complete

## Do

- Use early returns to reduce nesting
- Add JSDoc comments to exported functions
- Use `unknown` instead of `any` for untyped values
- Destructure function parameters when there are 3+ fields
- Log errors with structured metadata (request ID, timestamp)

## Don't

- Don't use `any` — use `unknown` and narrow with type guards
- Don't throw raw strings — always throw `Error` objects or custom error classes
- Don't import from `dist/` — always import from `src/`
- Don't add new dependencies without checking if an existing one covers the use case
- Don't write console.log for debugging — use the structured logger utility
- Don't commit `.env` files or secrets
