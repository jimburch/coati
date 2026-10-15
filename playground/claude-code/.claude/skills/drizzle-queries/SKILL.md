---
name: Drizzle Query Patterns
description: Teaches Claude how to write Drizzle queries, joins, and transactions for Linkly's Postgres schema.
---

# Drizzle Query Patterns

All database access in Linkly goes through Drizzle's query builder. Raw SQL is
reserved for analytics reporting in `src/lib/server/queries/analytics.ts`.

## Query functions live in `src/lib/server/queries/`

One file per domain entity (`links.ts`, `workspaces.ts`, `analytics.ts`).
Each exports named functions. Never inline queries in route handlers.

```typescript
// src/lib/server/queries/links.ts
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { links } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

export type Link = InferSelectModel<typeof links>;

export async function getLinkById(id: string, workspaceId: string): Promise<Link | undefined> {
	const [row] = await db
		.select()
		.from(links)
		.where(and(eq(links.id, id), eq(links.workspaceId, workspaceId), isNull(links.deletedAt)))
		.limit(1);
	return row;
}

export async function listLinksByWorkspace(
	workspaceId: string,
	opts: { limit?: number; cursor?: string } = {}
): Promise<Link[]> {
	return db
		.select()
		.from(links)
		.where(and(eq(links.workspaceId, workspaceId), isNull(links.deletedAt)))
		.orderBy(desc(links.createdAt))
		.limit(opts.limit ?? 50);
}
```

## Workspace scoping is mandatory

Every query against a workspace-owned table MUST filter by `workspaceId`.
This is the single most common cause of data leaks. Never write:

```typescript
// ✗ WRONG — leaks other workspaces' links
db.select().from(links).where(eq(links.id, id));

// ✓ RIGHT
db.select().from(links).where(and(eq(links.id, id), eq(links.workspaceId, workspaceId)));
```

## Transactions

Use transactions when mutating two or more tables or when a read-then-write
must be atomic.

```typescript
export async function transferLinkToWorkspace(linkId: string, fromId: string, toId: string) {
	return db.transaction(async (tx) => {
		const [link] = await tx
			.select()
			.from(links)
			.where(and(eq(links.id, linkId), eq(links.workspaceId, fromId)))
			.limit(1);
		if (!link) throw new Error('Link not found');

		await tx.update(links).set({ workspaceId: toId }).where(eq(links.id, linkId));
		await tx.insert(auditLog).values({
			workspaceId: toId,
			action: 'link.transferred',
			subjectId: linkId
		});
	});
}
```

## Soft deletes

Use `deleted_at IS NULL` in every read query. Use an UPDATE, not a DELETE.

```typescript
export async function softDeleteLink(id: string, workspaceId: string): Promise<void> {
	await db
		.update(links)
		.set({ deletedAt: new Date() })
		.where(and(eq(links.id, id), eq(links.workspaceId, workspaceId)));
}
```

## Type derivation

Derive types from the schema — never duplicate:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Link = InferSelectModel<typeof links>;
export type NewLink = InferInsertModel<typeof links>;
```

## Raw SQL (analytics only)

For aggregations Drizzle can't express cleanly, use the `sql` template tag with
interpolation — never string concatenation:

```typescript
import { sql } from 'drizzle-orm';

export async function clicksByDay(linkId: string, since: Date) {
	return db.execute(sql`
		SELECT date_trunc('day', clicked_at) AS day, count(*) AS clicks
		FROM link_clicks
		WHERE link_id = ${linkId} AND clicked_at >= ${since}
		GROUP BY day
		ORDER BY day
	`);
}
```

## Don't

- Don't write `db.query.*` — use `db.select()` for consistency
- Don't use `eq(col, value || null)` — use `isNull()` for nullable comparisons
- Don't call `db.execute(sql\`...\`)` with concatenated strings
- Don't forget `.limit()` on list queries — unbounded queries will bite you
