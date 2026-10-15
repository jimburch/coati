---
name: Drizzle Query Patterns
description: Teaches Codex how to write Drizzle queries, transactions, and LISTEN/NOTIFY integration for Pipedream's Postgres backend.
---

# Drizzle Patterns for Pipedream

All database access in Pipedream goes through Drizzle's query builder. Raw SQL
is reserved for cases Drizzle cannot express cleanly (analytics aggregations,
`LISTEN`/`NOTIFY`, advisory locks).

## Query functions live in `src/db/queries/`

One file per domain entity. Each exports named functions; never inline queries
in route handlers.

```typescript
// src/db/queries/jobs.ts
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../client.js';
import { jobs } from '../schema.js';
import type { InferSelectModel } from 'drizzle-orm';

export type Job = InferSelectModel<typeof jobs>;

export async function getJobById(id: string, workspaceId: string): Promise<Job | undefined> {
	const [row] = await db
		.select()
		.from(jobs)
		.where(and(eq(jobs.id, id), eq(jobs.workspaceId, workspaceId)))
		.limit(1);
	return row;
}

export async function listJobs(
	workspaceId: string,
	opts: { limit: number; cursor?: string; status?: Job['status'] }
): Promise<{ rows: Job[]; nextCursor: string | null }> {
	const conditions = [eq(jobs.workspaceId, workspaceId)];
	if (opts.status) conditions.push(eq(jobs.status, opts.status));
	if (opts.cursor) conditions.push(gt(jobs.id, opts.cursor));

	const rows = await db
		.select()
		.from(jobs)
		.where(and(...conditions))
		.orderBy(desc(jobs.createdAt))
		.limit(opts.limit + 1); // fetch one extra to detect pagination

	const hasMore = rows.length > opts.limit;
	return {
		rows: rows.slice(0, opts.limit),
		nextCursor: hasMore ? rows[opts.limit - 1]!.id : null
	};
}
```

## Workspace scoping is mandatory

Every query against a workspace-owned table MUST filter by `workspaceId`. This
is the single most common cause of data leaks in multi-tenant systems.

```typescript
// ✗ WRONG — leaks other workspaces' jobs
db.select().from(jobs).where(eq(jobs.id, id));

// ✓ RIGHT
db.select().from(jobs).where(and(eq(jobs.id, id), eq(jobs.workspaceId, workspaceId)));
```

## Transactions

Use transactions when mutating two or more tables or when a read-then-write
must be atomic.

```typescript
export async function claimJob(workerId: string): Promise<Job | null> {
	return db.transaction(async (tx) => {
		const [job] = await tx
			.select()
			.from(jobs)
			.where(and(eq(jobs.status, 'pending'), isNull(jobs.claimedBy)))
			.orderBy(jobs.createdAt)
			.limit(1)
			.for('update', { skipLocked: true }); // SELECT FOR UPDATE SKIP LOCKED

		if (!job) return null;

		await tx
			.update(jobs)
			.set({ status: 'running', claimedBy: workerId, claimedAt: new Date() })
			.where(eq(jobs.id, job.id));

		return { ...job, status: 'running', claimedBy: workerId };
	});
}
```

## LISTEN/NOTIFY

Pipedream's worker loop uses Postgres LISTEN/NOTIFY to avoid polling. The
listener runs outside Drizzle, directly on `pg.Client`:

```typescript
// src/queue/worker.ts
import { Client } from 'pg';

export async function startWorker() {
	const client = new Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	await client.query('LISTEN jobs_new');

	client.on('notification', async () => {
		while (true) {
			const job = await claimJob(process.env.WORKER_ID!);
			if (!job) break;
			await deliver(job);
		}
	});
}
```

When a job is enqueued, the insert fires a Postgres trigger that calls
`pg_notify('jobs_new', '')`.

## Type derivation

Always derive types from the schema — never duplicate:

```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;
```

## Raw SQL

For analytics aggregations, use the `sql` template tag with interpolation —
never string concatenation:

```typescript
import { sql } from 'drizzle-orm';

export async function deliveryStats(workspaceId: string, since: Date) {
	return db.execute(sql`
		SELECT status, count(*)::int AS count
		FROM deliveries
		WHERE workspace_id = ${workspaceId} AND created_at >= ${since}
		GROUP BY status
	`);
}
```

## Don't

- Don't use `db.query.*` — use `db.select()` for consistency across the codebase
- Don't forget `.limit()` on list queries; an unbounded query will OOM the app
- Don't compare nullable columns with `eq(col, null)` — use `isNull(col)`
- Don't mutate a row in-place then `update()` — construct the patch explicitly
- Don't hold transactions open across HTTP calls; commit fast, release the connection
