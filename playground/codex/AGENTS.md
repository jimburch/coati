# AGENTS.md — Pipedream API

## Project Overview

Pipedream is a task queue and webhook relay service. Incoming HTTP webhooks are
captured, enqueued, and delivered to downstream consumers with retries and
dead-lettering. This repo is the backend API only — there is no UI.

The service is deployed as a single Node process behind Caddy, backed by
PostgreSQL for durable storage and LISTEN/NOTIFY for the worker loop.

## Tech Stack

- **Runtime:** Node.js 22 (ESM, no CommonJS anywhere)
- **Language:** TypeScript 5.6+ (strict, `exactOptionalPropertyTypes: true`)
- **Framework:** Fastify 5
- **Database:** PostgreSQL 16
- **ORM:** Drizzle ORM
- **Validation:** Zod + `fastify-type-provider-zod`
- **Testing:** Vitest (+ `supertest` for HTTP integration)
- **Linting:** ESLint 9 (flat config) + `@typescript-eslint`
- **Package manager:** pnpm

## Project Structure

```
src/
├── server.ts                 # Fastify app factory (no listen)
├── index.ts                  # Entry point — starts listener, wires signals
├── plugins/                  # Fastify plugins (auth, error, rate-limit, swagger)
│   ├── auth.ts
│   ├── error-handler.ts
│   ├── ratelimit.ts
│   └── swagger.ts
├── routes/                   # Route plugins grouped by resource
│   ├── health.ts
│   ├── webhooks.ts           # POST /webhooks/:id — ingress
│   ├── jobs.ts               # GET /jobs, /jobs/:id — queue inspection
│   └── admin/
│       └── deliveries.ts
├── db/
│   ├── client.ts             # Drizzle client + pg Pool
│   ├── schema.ts             # Table definitions
│   └── migrations/
├── queue/
│   ├── worker.ts             # LISTEN/NOTIFY consumer loop
│   ├── dispatcher.ts         # HTTP delivery + retry with exponential backoff
│   └── deadletter.ts
├── lib/
│   ├── logger.ts             # pino instance, request-scoped child loggers
│   ├── hmac.ts               # Webhook signature verification
│   └── time.ts               # Deterministic clock for tests
└── types/
    └── index.ts
```

## Coding Conventions

- ESM only; always use `.js` suffix on local imports (e.g., `import { x } from './lib/x.js'`)
- `const` by default; `let` only when reassignment is required; never `var`
- Prefer named exports; default exports only for Fastify plugin factories
- All exported functions need explicit return types
- Keep files under ~200 lines; if longer, split by responsibility
- One Fastify route plugin per resource file; each registers its own schemas
- Use Zod for every request body / params / querystring; wire through `fastify-type-provider-zod` so handlers are strongly typed
- Never throw string literals — throw `Error` instances or custom error classes from `src/lib/errors.ts`
- All `async` route handlers must let errors propagate — the error-handler plugin formats them

## API Response Format

Consistent envelope on every route:

- Success: `{ data: T, meta?: { ... } }`
- Error: `{ error: { message: string, code: string, details?: unknown } }`

Status codes follow REST conventions: 200 read, 201 create, 202 accepted-queued,
204 delete, 400 validation, 401 unauth, 404 not found, 409 conflict, 422 business
rule violation, 429 rate limited, 500 internal.

## Database

- Migrations generated via `pnpm db:generate`; never hand-write SQL migrations
- Every query must be workspace-scoped when operating on workspace-owned tables
- Use transactions when mutating two or more tables
- No `db.query.*` — use `db.select()` / `db.insert()` / `db.update()` for consistency

## Testing

- Unit tests colocate with source: `hmac.ts` → `hmac.test.ts`
- Integration tests under `src/__tests__/integration/` hit a real Postgres via `docker compose up -d db-test`
- Every bug fix needs a regression test that fails on the old code
- Never mock the database in integration tests — use a test schema and truncate between tests
- Unit tests may mock external services with `vi.mock()`

## Do

- Run `pnpm lint && pnpm check && pnpm test:unit` before declaring a task done
- Add an `@fastify/swagger` schema annotation to every new route
- Use the `pino` request logger (`request.log.info(...)`) — never `console.log`
- Use `AbortController` for any HTTP call that could hang; default 10s timeout

## Don't

- Don't install a different validator (no Joi, Yup, AJV); Zod is the single source
- Don't use CommonJS (`require`, `module.exports`)
- Don't call `fetch` without a timeout
- Don't handle retries in the dispatcher without exponential backoff + jitter
- Don't commit `.env` files
- Don't add an ORM other than Drizzle
