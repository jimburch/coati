# CLAUDE.md — My TypeScript App

## Project Overview

A REST API service built with Express and TypeScript. Provides user management,
authentication, and a lightweight task-tracking system. Deployed as a single
Node.js process behind Nginx on a VPS.

## Tech Stack

- **Runtime:** Node.js 22 (LTS)
- **Language:** TypeScript 5.5+ (strict mode)
- **Framework:** Express 4
- **Database:** SQLite via better-sqlite3 (single-file, no external DB needed)
- **Testing:** Vitest
- **Linting:** ESLint 9 flat config

## Project Structure

```
src/
├── index.ts          # Server entry — creates app, starts listening
├── app.ts            # Express app factory (for testability)
├── routes/
│   ├── users.ts      # CRUD for /api/users
│   ├── tasks.ts      # CRUD for /api/tasks
│   └── health.ts     # GET /health
├── middleware/
│   ├── auth.ts       # Bearer-token validation
│   ├── errors.ts     # Global error handler
│   └── validate.ts   # Zod-based request validation
├── db/
│   ├── client.ts     # Database connection singleton
│   ├── schema.ts     # Table definitions
│   └── migrations/   # SQL migration files
├── services/
│   ├── userService.ts
│   └── taskService.ts
└── utils/
    ├── logger.ts     # Structured JSON logging (pino)
    └── config.ts     # Env-var loading with defaults
```

## Coding Conventions

- Use `const` by default; `let` only when reassignment is necessary; never `var`
- All functions must have explicit return types — no implicit `any`
- Prefer named exports over default exports
- Error responses follow `{ error: string, code: string }` shape
- Success responses follow `{ data: T }` shape
- Route handlers should be thin — delegate logic to service functions
- One route file per resource; register in `app.ts` with `app.use()`
- Write unit tests for services, integration tests for routes
- Keep test files next to source: `userService.test.ts` beside `userService.ts`

## Do

- Run `npm run lint` before considering any change complete
- Validate all request bodies with Zod schemas defined in the route file
- Use `try/catch` in async route handlers or use an async wrapper
- Add JSDoc comments to public service functions
- Use HTTP status codes correctly (201 for creation, 204 for deletion, etc.)

## Don't

- Don't install ORMs — use raw SQL via better-sqlite3
- Don't add authentication middleware to the health endpoint
- Don't use `console.log` — use the logger utility
- Don't commit `.env` files; use `.env.example` as a template
- Don't use `any` as a type — prefer `unknown` and narrow
- Don't mutate function parameters

## Running Locally

```bash
npm install
cp .env.example .env
npm run dev          # starts with hot-reload via tsx
npm test             # runs vitest
```
