# Copilot Instructions — Ledger

## Project Overview

Ledger is a multi-tenant expense management SaaS for mid-market finance teams.
The product ships as a single Next.js 15 application using the App Router,
with a Prisma-backed Postgres database and a tRPC v11 API layer.

The codebase follows strict layering: **Server Components** render data,
**tRPC procedures** expose business logic, **Prisma models** own persistence.
Client components are used only when interactivity demands it.

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19 RSC, Turbopack dev)
- **Language:** TypeScript 5.6+ (strict mode, `noUncheckedIndexedAccess: true`)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Database:** PostgreSQL 16
- **ORM:** Prisma 6 (`relationMode = "foreignKeys"`)
- **API layer:** tRPC v11 (App Router adapter)
- **Auth:** NextAuth v5 (Auth.js) with GitHub + Google + credentials providers
- **Background jobs:** Inngest
- **Testing:** Vitest (unit) + Playwright (e2e)
- **Package manager:** pnpm

## Project Structure

```
src/
├── app/
│   ├── (marketing)/              # Public pages (landing, pricing, docs)
│   ├── (app)/                    # Authenticated dashboard
│   │   ├── [workspaceSlug]/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   └── settings/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── trpc/[trpc]/route.ts
│   │   └── inngest/route.ts
│   └── layout.tsx
├── server/
│   ├── api/
│   │   ├── root.ts               # AppRouter definition
│   │   ├── trpc.ts               # Context, middleware, procedure builders
│   │   └── routers/
│   │       ├── expenses.ts
│   │       ├── reports.ts
│   │       └── workspaces.ts
│   ├── auth.ts                   # Auth.js config
│   └── inngest/
│       ├── client.ts
│       └── functions/
├── components/
│   ├── ui/                       # shadcn/ui primitives (do not edit)
│   └── *.tsx                     # App components
├── lib/
│   ├── prisma.ts                 # Prisma client singleton
│   ├── validation/               # Zod schemas shared client/server
│   └── utils.ts
└── styles/
    └── globals.css
```

## Architecture rules

- **Server Components by default.** Only add `'use client'` when the file needs
  state, effects, or event handlers. If adding a client component, push the
  boundary as deep as possible — a leaf, not a whole page.
- **Server Components fetch via Prisma or tRPC callers.** Never use
  `fetch('/api/trpc/...')` from a Server Component — call the router directly
  via `createCaller()`.
- **Client Components call tRPC via `@trpc/react-query`.** Never hand-roll fetch
  to our own API routes from the client.
- **Mutations go through tRPC procedures.** Never expose Next.js Route Handlers
  for business logic — those exist only for NextAuth and Inngest webhooks.

## Coding Conventions

- Use `const` by default; `let` only when reassignment is necessary; never `var`
- Prefer named exports; avoid default exports except where Next.js requires them (page, layout, route)
- All exported functions have explicit return types
- Prefer `interface` for object shapes, `type` for unions, intersections, mapped types
- Destructure function parameters when 3+ fields
- Use `readonly` on props and DTO fields that should not mutate after construction
- Template literals over string concatenation
- One component per file; filename in PascalCase matches the default export

## tRPC conventions

- Procedures live under `src/server/api/routers/` grouped by domain
- Every procedure validates input with Zod: `.input(z.object({ ... }))`
- Use `protectedProcedure` for anything requiring a signed-in user
- Use `workspaceProcedure` for anything scoped to a workspace — it injects the workspace into context after checking membership
- Return typed payloads — let the inference flow to the client; never narrow return types with `as`

## Prisma conventions

- The Prisma client is a singleton imported from `~/lib/prisma`
- Queries live in tRPC procedures, not in Server Components directly — the exception is a dedicated query helper in `src/server/queries/` when reused
- Every multi-tenant table has a `workspaceId` column AND every read filters by it — no exceptions
- Use `prisma.$transaction()` when mutating two or more tables
- Never use `prisma.$queryRawUnsafe` — use `prisma.$queryRaw` with tagged templates

## Error Handling

- tRPC procedures throw `TRPCError` with the correct code (`NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`)
- Client surfaces errors via `toast.error(error.message)` — never alert()
- Log with `pino` via `~/server/logger` — never `console.log` in server code
- Never swallow errors silently

## Testing

- Unit tests colocate with source: `expenses.ts` → `expenses.test.ts`
- E2E tests live in `e2e/` and run against a real Postgres via `docker compose up -d db`
- Test names read as sentences starting with "should"
- Prefer `toEqual` over `toBe` for objects and arrays
- Every bug fix includes a regression test

## Preferred Libraries

- **Validation:** Zod (not Joi, not Yup, not Valibot)
- **Data fetching (client):** `@trpc/react-query`
- **Forms:** React Hook Form + Zod resolver
- **Date handling:** `date-fns` (not moment, not Day.js)
- **UUID:** `crypto.randomUUID()` (not the `uuid` package)
- **Tables:** `@tanstack/react-table`
- **Charts:** Recharts

## Do Not

- Do not use `any` — use `unknown` and narrow with type guards
- Do not use `React.FC` — type props via an explicit interface
- Do not use default exports outside of Next.js-required files
- Do not write `fetch()` to our own `/api/trpc/*` from Server Components
- Do not introduce an HTTP client for our own API — tRPC is the only entry
- Do not write SQL strings in application code — use Prisma
- Do not mutate `params` or `searchParams`
- Do not import from `~/server/*` into Client Components — the server code must not ship
- Do not add new dependencies without opening a PR comment explaining the trade-off first
