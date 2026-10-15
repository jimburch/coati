# /trpc-procedure — Scaffold a new tRPC procedure

Generate a new procedure in the correct router with the right procedure
builder, Zod input schema, and baseline test.

## Inputs

- `$1` — router name (e.g., `expenses`, `reports`). If new, create it and
  register in `src/server/api/root.ts`.
- `$2` — procedure name (e.g., `list`, `create`, `archive`).
- `$3` — kind: `query` or `mutation`.
- Description of what the procedure does.

## Template to produce

```typescript
// src/server/api/routers/<router>.ts
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { workspaceProcedure, router } from '~/server/api/trpc';

export const <router>Router = router({
  <name>: workspaceProcedure
    .input(
      z.object({
        // explicit schema — no passthrough
      })
    )
    .<kind>(async ({ ctx, input }) => {
      // workspace is guaranteed on ctx by workspaceProcedure
      const result = await ctx.prisma.<model>.findMany({
        where: { workspaceId: ctx.workspace.id, /* ... */ }
      });
      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '…' });
      }
      return result;
    })
});
```

## Rules

- Use `workspaceProcedure` by default. Only use `protectedProcedure` when the
  operation is workspace-agnostic (e.g., `me.profile`).
- Use `publicProcedure` only for truly public endpoints (marketing contact form).
- Every mutation has Zod input validation. Empty input still gets `z.object({})`.
- Every read filters by `workspaceId`. No exceptions.
- Throw `TRPCError` with a specific code:
  - `NOT_FOUND` — resource doesn't exist
  - `UNAUTHORIZED` — no session
  - `FORBIDDEN` — wrong workspace or insufficient role
  - `CONFLICT` — uniqueness violation
  - `BAD_REQUEST` — business rule violation (Zod handles input validation separately)

## Generate a baseline test

Write `src/server/api/routers/<router>.test.ts` with:

- Happy path: returns the expected data
- Unauthorized: no session throws `UNAUTHORIZED`
- Wrong workspace: userA cannot see workspaceB's data (returns empty or throws `FORBIDDEN`)
- Invalid input: Zod rejects with `BAD_REQUEST`

Use the `createTestCaller({ userId, workspaceId })` helper.

## After generation

1. Run `pnpm check` to verify types flow through to the client.
2. Run `pnpm test:unit` to verify the baseline tests pass.
3. Report the inferred client signature (what the caller will look like from
   a component):

```
api.<router>.<name>.useQuery({ ... })
```
