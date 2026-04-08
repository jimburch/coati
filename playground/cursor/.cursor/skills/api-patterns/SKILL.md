# API Patterns Skill

This skill provides instructions for writing Express API endpoints that follow project conventions.

## Route Handler Template

Every new route handler should follow this structure:

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/async-handler';
import { sendSuccess, sendError } from '../../lib/responses';

const router = Router();

const CreateItemSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional()
});

router.post(
	'/',
	asyncHandler(async (req, res) => {
		const parsed = CreateItemSchema.safeParse(req.body);
		if (!parsed.success) {
			return sendError(res, 'Invalid request body', 'VALIDATION_ERROR', 400);
		}

		const item = await itemService.create(parsed.data);
		return sendSuccess(res, item, 201);
	})
);

export default router;
```

## Response Helpers

Always use the project's response helpers, never raw `res.json()`:

- `sendSuccess(res, data, status = 200)` — wraps data in `{ data }` envelope
- `sendError(res, message, code, status)` — returns `{ error, code }` envelope

## Validation Rules

- Define Zod schemas at the top of the route file, colocated with the handler
- Use `.safeParse()` (not `.parse()`) to avoid throwing — handle errors explicitly
- Share common field schemas from `src/lib/schemas/common.ts` (e.g., `UuidSchema`, `PaginationSchema`)

## Authentication

- Use the `requireAuth` middleware for protected routes
- Access the authenticated user via `res.locals.user`
- Never trust client-provided user IDs — use the session user ID

## Error Handling

- Throw `AppError` subclasses for expected errors (NotFoundError, ConflictError, etc.)
- The global error handler in `src/middleware/error-handler.ts` catches these automatically
- For unexpected errors, let them propagate — the error handler logs and returns 500

## Pagination

For list endpoints, accept `page` and `limit` query params:

```typescript
const PaginationSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20)
});
```

Return pagination metadata in the response:

```typescript
sendSuccess(res, {
	items,
	pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
});
```

## File Organization

- One router per resource in `src/routes/`
- Mount all routers in `src/routes/index.ts`
- Keep route files under 100 lines — extract complex logic into `src/services/`
