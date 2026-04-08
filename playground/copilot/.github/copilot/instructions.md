# Extended Copilot Instructions — Code Generation

## Import Ordering

Organize imports in this exact order, separated by blank lines:

1. Node built-in modules (`node:fs`, `node:path`, etc.)
2. External packages (`express`, `zod`, `pino`)
3. Internal aliases starting with `@/` (maps to `src/`)
4. Relative imports (`./`, `../`)

Within each group, sort alphabetically by module path.

## Naming Conventions

- **Files**: kebab-case (`user-service.ts`, `auth-middleware.ts`)
- **Interfaces**: PascalCase, no `I` prefix (`User`, not `IUser`)
- **Type aliases**: PascalCase (`CreateUserInput`, `PaginatedResponse<T>`)
- **Functions**: camelCase, verb-first (`createUser`, `findOrderById`, `validateToken`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`)
- **Enums**: PascalCase name, PascalCase members (`enum Status { Active, Inactive }`)
- **Route parameters**: camelCase in code, kebab-case in URLs (`/user-profiles/:userId`)
- **Environment variables**: UPPER*SNAKE_CASE, prefixed with `APP*` (`APP_DATABASE_URL`)

## Error Handling Patterns

When generating error handling code, follow these patterns:

```typescript
// Custom errors extend AppError
export class NotFoundError extends AppError {
	constructor(resource: string, id: string) {
		super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
	}
}

// Service functions return Result types for expected failures
type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

// Use early returns for validation
export function createUser(input: unknown): Result<User> {
	const parsed = CreateUserSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: new ValidationError(parsed.error) };
	}
	// ... proceed with valid data
}
```

## Response Formatting

All API responses use this envelope:

```typescript
// Success
{ "data": T, "meta"?: { "page": number, "total": number } }

// Error
{ "error": { "message": string, "code": string, "details"?: unknown } }
```

Never return raw arrays or primitives at the top level.

## Zod Schema Conventions

- Name schemas with a `Schema` suffix: `CreateUserSchema`, `UpdateOrderSchema`
- Derive TypeScript types from schemas: `type CreateUserInput = z.infer<typeof CreateUserSchema>`
- Place schemas in `src/schemas/` alongside the feature they validate
- Reuse base schemas with `.pick()`, `.omit()`, `.extend()` rather than duplicating fields

## Function Documentation

Add JSDoc comments to all exported functions. Include:

- A one-line summary
- `@param` for each parameter (with description)
- `@returns` describing the return value
- `@throws` if the function can throw

```typescript
/**
 * Finds a user by their unique identifier.
 *
 * @param userId - The UUID of the user to find
 * @returns The user object if found, or undefined
 * @throws DatabaseError if the query fails
 */
export async function findUserById(userId: string): Promise<User | undefined> {
	// ...
}
```

## Test Generation Rules

- Always import from `vitest`: `import { describe, it, expect, vi } from "vitest"`
- Mock dependencies with `vi.mock()` at the top of the file
- Use `beforeEach` to reset mocks via `vi.clearAllMocks()`
- Test both success and failure paths for every function
- For async functions, always use `async/await` in tests (not `.resolves`/`.rejects`)
