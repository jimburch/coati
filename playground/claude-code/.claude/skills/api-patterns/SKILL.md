---
name: API Endpoint Patterns
description: Teaches Claude how to write Express API endpoints following this project's conventions for routing, validation, error handling, and response formatting.
---

# API Endpoint Patterns

When creating or modifying API endpoints in this project, follow these patterns exactly.

## Route File Structure

Each route file exports a router and is registered in `app.ts`:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

export const tasksRouter = Router();

// List
tasksRouter.get('/', async (req, res, next) => {
	try {
		const tasks = await taskService.list();
		res.json({ data: tasks });
	} catch (err) {
		next(err);
	}
});
```

## Request Validation

Define Zod schemas at the top of the route file, then use the `validate` middleware:

```typescript
const CreateTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(2000).optional(),
	assigneeId: z.string().uuid().optional()
});

tasksRouter.post('/', requireAuth, validate(CreateTaskSchema), async (req, res, next) => {
	try {
		const task = await taskService.create(req.body);
		res.status(201).json({ data: task });
	} catch (err) {
		next(err);
	}
});
```

## Response Format

All responses MUST use these shapes:

- **Success:** `{ data: T }` — where T is the resource or array of resources
- **Error:** `{ error: string, code: string }` — human-readable message plus a machine-readable code

Status codes:

- `200` — successful read or update
- `201` — successful creation
- `204` — successful deletion (no body)
- `400` — validation error (code: `VALIDATION_ERROR`)
- `401` — missing or invalid auth (code: `UNAUTHORIZED`)
- `404` — resource not found (code: `NOT_FOUND`)
- `409` — conflict, e.g., duplicate (code: `CONFLICT`)
- `500` — unexpected server error (code: `INTERNAL_ERROR`)

## Error Handling

Never let errors escape unhandled. Every async handler must either:

1. Wrap logic in `try/catch` and call `next(err)`, or
2. Use the `asyncHandler` wrapper utility

The global error handler in `middleware/errors.ts` catches everything and formats it.

## Service Layer

Route handlers should be thin. Extract business logic into service functions:

```typescript
// services/taskService.ts
import { db } from '../db/client.js';

export function create(input: { title: string; description?: string }): Task {
	const stmt = db.prepare(
		'INSERT INTO tasks (id, title, description, created_at) VALUES (?, ?, ?, ?)'
	);
	const id = crypto.randomUUID();
	stmt.run(id, input.title, input.description ?? null, new Date().toISOString());
	return getById(id)!;
}
```

## Authentication

Protected routes must use the `requireAuth` middleware before the handler.
The middleware attaches `req.user` with `{ id, email, role }`.
Always check `req.user` exists in TypeScript even after middleware — this satisfies strict mode.
