---
name: Drizzle Queries for Compose
description: Teaches Claude how to write Drizzle queries for Compose — workspace scoping, transactions, and when to use raw SQL.
---

# Drizzle Queries

All database access in Compose goes through Drizzle via named functions in
`src/lib/server/queries/`. Inline queries in routes are forbidden — they get
duplicated and drift.

## Query functions

One file per domain entity. Named functions exported individually.

```typescript
// src/lib/server/queries/notes.ts
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type Note = InferSelectModel<typeof notes>;

export async function getNoteById(id: string, workspaceId: string): Promise<Note | undefined> {
  const [row] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)))
    .limit(1);
  return row;
}

export async function listNotesByWorkspace(workspaceId: string): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt));
}

export async function archiveNote(id: string, workspaceId: string): Promise<void> {
  await db
    .update(notes)
    .set({ archivedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.workspaceId, workspaceId)));
}
```

## Workspace scoping is mandatory

Every query against a workspace-owned table MUST filter by `workspaceId`.
This is the #1 source of cross-tenant data leaks.

```typescript
// ✗ WRONG
db.select().from(notes).where(eq(notes.id, id));

// ✓ RIGHT
db.select().from(notes).where(and(eq(notes.id, id), eq(notes.workspaceId, workspaceId)));
```

## Transactions

Use when mutating two or more tables, or when a read-then-write must be atomic.

```typescript
export async function shareNote(
  noteId: string,
  workspaceId: string,
  userId: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const [note] = await tx
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.workspaceId, workspaceId)))
      .limit(1);
    if (!note) throw new Error('Note not found');

    await tx.insert(noteShares).values({
      noteId,
      userId,
      grantedAt: new Date()
    });
    await tx.insert(auditLog).values({
      workspaceId,
      action: 'note.shared',
      subjectId: noteId,
      metadata: { sharedWith: userId }
    });
  });
}
```

## Types

Always derive from the schema — never duplicate:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Note = InferSelectModel<typeof notes>;
export type NewNote = InferInsertModel<typeof notes>;
```

**Re-export from `src/lib/types/index.ts`** so Cursor can import them in
components:

```typescript
// src/lib/types/index.ts
export type { Note, NewNote } from '$lib/server/queries/notes';
```

(Re-exporting a type from a server file is fine — TypeScript strips the
import at compile time, so no server code reaches the client.)

## Don't

- Don't inline queries in routes
- Don't skip `.limit()` on list queries
- Don't use `eq(col, null)` — use `isNull(col)`
- Don't use `db.query.*` — use `db.select()` for consistency
