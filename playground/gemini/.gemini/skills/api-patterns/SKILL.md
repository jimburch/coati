---
name: api-patterns
description: Conventions and patterns for writing Express API route handlers in this project
---

# API Patterns

## Route Handler Structure

Every route handler follows the same structure: validate input, call the service
layer, return a consistent response shape, and let the error middleware handle
failures.

```typescript
import { Router, Request, Response, NextFunction } from "express";
import { validateBody } from "../middleware/validate.js";
import { createTaskSchema } from "../types/index.js";
import { TaskService } from "../services/taskService.js";

const router = Router();

router.post(
  "/tasks",
  validateBody(createTaskSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await TaskService.create(req.body);
      res.status(201).json({ data: task });
    } catch (err) {
      next(err);
    }
  }
);

export { router as taskRouter };
```

## Response Format

All endpoints return JSON in one of two shapes:

**Success:**
```json
{ "data": { "id": "abc", "title": "My task", "done": false } }
```

**Error:**
```json
{ "error": "Task not found", "code": "TASK_NOT_FOUND" }
```

Never return bare strings or arrays at the top level. Always wrap in `{ data }` or `{ error, code }`.

## Validation Middleware

Use the `validateBody` middleware to parse and validate request bodies before the
handler executes. The middleware returns a 400 with a structured error if validation
fails, so handlers can trust that `req.body` is already the correct shape.

```typescript
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: result.error.issues.map((i) => i.message).join("; "),
        code: "VALIDATION_ERROR",
      });
      return;
    }
    req.body = result.data;
    next();
  };
};
```

## Error Handling

Route handlers must **not** send error responses directly. Instead, call `next(err)`
and let the centralized error middleware format the response.

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { AppError } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
};
```

## Pagination

List endpoints accept `page` and `limit` query parameters and return pagination
metadata alongside the data array:

```json
{
  "data": [{ "id": "1" }, { "id": "2" }],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

## Authentication

Protected routes use the `requireAuth` middleware which reads the `Authorization`
header, verifies the token, and attaches the user to `req.user`. If the token is
missing or invalid, the middleware returns 401 before the handler runs.
