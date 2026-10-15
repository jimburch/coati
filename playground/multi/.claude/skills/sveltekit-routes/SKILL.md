---
name: SvelteKit Routes (backend side)
description: Teaches Claude how to write SvelteKit load functions, form actions, and endpoints for Compose. Stops at the UI boundary — Cursor handles components.
---

# SvelteKit Routes — Backend Side

This skill covers the files Claude owns: `+page.server.ts`, `+server.ts`,
`hooks.server.ts`, `+layout.server.ts`. It stops at the UI boundary.

## Load functions

`load` functions run on every SSR request (and on client navigation for SPA
routes). They fetch data and throw for error states.

```typescript
// src/routes/(app)/notes/[id]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getNoteById } from '$lib/server/queries/notes';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!locals.user) throw redirect(302, '/login');

  const note = await getNoteById(params.id, locals.user.workspaceId);
  if (!note) throw error(404, 'Note not found');

  return { note };
};
```

Return what the UI needs — but do NOT shape data for display. Cursor will
transform the load result as needed in the component.

## Form actions

Form actions handle mutations. Pair them with the UI file where `use:enhance`
and form tags live — but you don't write that file.

```typescript
// src/routes/(app)/notes/[id]/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { UpdateNoteSchema } from '$lib/validation';
import { updateNote, archiveNote } from '$lib/server/queries/notes';

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    if (!locals.user) return fail(401, { error: 'UNAUTHORIZED' });

    const form = await request.formData();
    const parsed = UpdateNoteSchema.safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      return fail(400, { errors: parsed.error.flatten().fieldErrors });
    }

    const note = await updateNote(params.id, locals.user.workspaceId, parsed.data);
    return { note };
  },

  archive: async ({ locals, params }) => {
    if (!locals.user) return fail(401, { error: 'UNAUTHORIZED' });
    await archiveNote(params.id, locals.user.workspaceId);
    return { success: true };
  }
};
```

**Document every action you add.** Cursor needs to know the action name, the
expected form data, and the return shape. Include this in the handoff note.

## JSON endpoints

For the programmatic API only (CLI, third-party integrations).

```typescript
// src/routes/api/v1/notes/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CreateNoteSchema } from '$lib/validation';
import { createNote, listNotes } from '$lib/server/queries/notes';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.apiKey) throw error(401);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
  const notes = await listNotes(locals.apiKey.workspaceId, { limit });
  return json({ data: notes });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.apiKey) throw error(401);
  const body = await request.json();
  const parsed = CreateNoteSchema.safeParse(body);
  if (!parsed.success) {
    throw error(400, JSON.stringify({ error: 'Invalid', code: 'VALIDATION' }));
  }
  const note = await createNote({ ...parsed.data, workspaceId: locals.apiKey.workspaceId });
  return json({ data: note }, { status: 201 });
};
```

## Shared types — the seam

The shared types in `src/lib/types/` are the contract between Claude and
Cursor. When you change anything about a returned shape, update the type
and mention it in the handoff note:

```typescript
// src/lib/types/index.ts
export interface Note {
  id: string;
  title: string;
  body: string;
  authorId: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;  // added in PR #143 — Cursor should handle muted styling
}
```

## Don't

- Don't style or format output for display — return raw data
- Don't write or edit `+page.svelte` or `+layout.svelte` files
- Don't import `$lib/components/*` — those are Cursor's
- Don't define UI-shaped types (e.g., `ButtonVariant`) in `src/lib/types` — those live in the component
