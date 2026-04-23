---
name: Fastify Route Patterns
description: Teaches Codex how to write Fastify route plugins for Pipedream, including Zod-typed schemas, error handling, and response envelopes.
---

# Fastify Route Patterns

Every route in Pipedream is a Fastify plugin. Each plugin registers its schemas
and handlers, and is mounted by the app factory in `src/server.ts`.

## Plugin file structure

```typescript
// src/routes/jobs.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { listJobs, getJobById } from '../db/queries/jobs.js';
import { NotFoundError } from '../lib/errors.js';

const JobParamSchema = z.object({ id: z.string().uuid() });
const ListQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	cursor: z.string().optional(),
	status: z.enum(['pending', 'running', 'succeeded', 'failed']).optional()
});

export const jobsRoutes: FastifyPluginAsyncZod = async (app) => {
	app.get(
		'/jobs',
		{
			schema: {
				tags: ['jobs'],
				querystring: ListQuerySchema,
				response: {
					200: z.object({
						data: z.array(z.object({ id: z.string().uuid(), status: z.string() })),
						meta: z.object({ nextCursor: z.string().nullable() })
					})
				}
			}
		},
		async (request) => {
			const { limit, cursor, status } = request.query;
			const { rows, nextCursor } = await listJobs(request.workspace.id, { limit, cursor, status });
			return { data: rows, meta: { nextCursor } };
		}
	);

	app.get(
		'/jobs/:id',
		{
			schema: {
				tags: ['jobs'],
				params: JobParamSchema
			}
		},
		async (request) => {
			const job = await getJobById(request.params.id, request.workspace.id);
			if (!job) throw new NotFoundError('Job not found');
			return { data: job };
		}
	);
};
```

## Registering in `src/server.ts`

```typescript
import { jobsRoutes } from './routes/jobs.js';
app.register(jobsRoutes, { prefix: '/api/v1' });
```

## Response envelope

**Success:** `{ data: T, meta?: {...} }`
**Error:** `{ error: { message: string, code: string, details?: unknown } }`

The error envelope is assembled by the global error handler in
`src/plugins/error-handler.ts`. Never construct it inline.

## Error handling

Never throw string literals. Use custom errors from `src/lib/errors.ts`:

```typescript
import { NotFoundError, ConflictError, ValidationError } from '../lib/errors.js';

if (!job) throw new NotFoundError('Job not found');
if (existing) throw new ConflictError('Job id already used', { details: { id } });
```

The error handler maps error classes to HTTP status codes. Adding a new error
class requires updating the handler's switch statement.

## Authentication

`request.workspace` is populated by the `auth` plugin. Any protected route
must register under a prefix with `preHandler: app.auth(['apiKey'])` or via
an `onRequest` hook in the plugin factory.

```typescript
export const jobsRoutes: FastifyPluginAsyncZod = async (app) => {
	app.addHook('onRequest', app.authenticate);
	// … routes below inherit the hook
};
```

## Pagination

- Always bounded: `limit` max 100
- Cursor is an opaque base64url-encoded token, never a raw id
- Return `meta.nextCursor: null` when there are no more rows

## Don't

- Don't bypass Zod by reading `request.raw.body` — use `request.body`
- Don't return different response shapes from the same route
- Don't register routes outside of a Fastify plugin
- Don't call `reply.send(…)` from an async handler — just return the value
