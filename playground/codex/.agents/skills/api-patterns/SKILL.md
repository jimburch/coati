---
name: api-patterns
description: Conventions for writing Express API route handlers in this project
---

# API Patterns

## Route Handler Structure

Every route handler follows this pattern:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { TaskService } from '../services/taskService.js';

const router = Router();

const createTaskSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	assigneeId: z.string().uuid().optional()
});

router.post(
	'/',
	validate(createTaskSchema),
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const task = await TaskService.create(req.body);
			res.status(201).json({ data: task });
		} catch (err) {
			next(err);
		}
	}
);
```

## Key Rules

1. **Thin handlers** — Route handlers parse input and call services. No business logic in routes.
2. **Zod validation** — Define a schema for every POST/PATCH body. Use the `validate` middleware.
3. **Consistent envelope** — Always return `{ data: T }` on success and `{ error, code }` on failure.
4. **Status codes** — 200 for reads, 201 for creates, 204 for deletes, 400 for validation, 404 for not found, 500 for unexpected.
5. **Error forwarding** — Always call `next(err)` in catch blocks. The centralized `errorHandler` middleware formats the response.
6. **Async safety** — Every async handler must have a try/catch or use an async wrapper utility.
7. **No side effects in GET** — GET handlers must never mutate state.

## Pagination

List endpoints accept `?page=1&limit=20` and return:

```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 142 }
}
```
