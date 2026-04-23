# /refactor — Extract a tRPC procedure from inline code

Use this prompt when code in a Server Component or Route Handler should be
moved into a reusable tRPC procedure.

## Inputs

- The source file where the logic currently lives
- The target router (e.g., `expenses`, `reports`, or a new router)
- The desired procedure name (e.g., `listPending`)

## Steps

1. Read the source file and isolate the block to extract. Identify:
   - Inputs (what does the caller pass in?)
   - Authorization requirements (authenticated? workspace-scoped? admin?)
   - Return shape
2. Open the target router under `src/server/api/routers/`. If it does not
   exist, create it and register it in `src/server/api/root.ts`.
3. Scaffold the new procedure:
   - Use `protectedProcedure` for authenticated-only
   - Use `workspaceProcedure` for workspace-scoped (most common)
   - Define `.input(z.object({...}))` even if no inputs today (empty object)
   - Add `.query` or `.mutation` based on semantics
4. Move the logic into the procedure. Replace Prisma access with the
   `ctx.prisma` client. Replace session reads with `ctx.session.user.id`.
5. Rewrite the caller to use the appropriate invocation:
   - Server Component → `createCaller(await createContext()).expenses.listPending(…)`
   - Client Component → `api.expenses.listPending.useQuery(…)`
6. Remove the inlined logic from the caller. Do not leave dead imports.
7. Add a test file at `src/server/api/routers/<router>.test.ts` covering
   the new procedure: happy path + unauthorized access + invalid input.
8. Run `pnpm check && pnpm lint && pnpm test:unit`. Iterate until clean.

## Output

A commit-ready diff with:
- The new procedure
- The updated caller
- The new test file
- An updated `src/server/api/root.ts` if a new router was created

Do not bundle unrelated cleanups.
