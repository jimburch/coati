# /rsc-pattern — Convert Client Component → Server Component (or vice versa)

Use this prompt to push the client/server boundary to the right place.

## Common signs a component should become a Server Component

- It fetches data on mount and the data rarely changes
- It doesn't use `useState`, `useEffect`, or event handlers in its own body
- Its loading state is uninteresting — a spinner is fine
- Its props are serializable

## Common signs a component should stay (or become) a Client Component

- It uses `useState`, `useEffect`, `useRef`, or event handlers
- It uses browser-only APIs (`window`, `localStorage`, `IntersectionObserver`)
- It uses React hooks from `@trpc/react-query`, `react-hook-form`, etc.
- It subscribes to realtime updates

## Process

### 1. Identify the boundary

- Read the component and its children.
- Find the deepest node that *genuinely* needs client-side capability.
- Walk back up until you hit the shallowest node that introduces a client dep.
- That node is the new `'use client'` boundary.

### 2. Split if needed

If a parent component has both server-only and client-only concerns:

- Extract the client bits into a leaf component
- Keep the parent as a Server Component
- Pass server-computed data as props to the client leaf

### 3. Rewrite data fetching

**Server Component path:**

```tsx
// src/app/(app)/[workspaceSlug]/expenses/page.tsx
import { createCaller } from '~/server/api/createCaller';
import { ExpenseTable } from '~/components/ExpenseTable';

export default async function ExpensesPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const caller = await createCaller(workspaceSlug);
  const expenses = await caller.expenses.list();
  return <ExpenseTable expenses={expenses} />;
}
```

**Client Component path (interactive table):**

```tsx
'use client';
import { api } from '~/trpc/react';

export function ExpenseTable({ expenses: initial }: { expenses: Expense[] }) {
  const query = api.expenses.list.useQuery(undefined, { initialData: initial });
  return <table>…</table>;
}
```

### 4. Verify the boundary

Run `pnpm check`. If the build complains about `~/server/*` being imported
from a client module, the boundary is wrong — push it deeper.

## Don't

- Don't mark a whole page `'use client'` because one leaf needs state
- Don't pass non-serializable props across the boundary (Date objects, functions, Maps)
- Don't use `async` on a Client Component — React won't allow it
- Don't import from `~/lib/prisma` or `~/server/*` in any client module
