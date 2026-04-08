---
name: testing
description: Testing conventions and patterns for writing Vitest tests in this project
---

# Testing Conventions

## File Organization

Test files are colocated with the source files they test. A service at
`src/services/taskService.ts` has its tests at `src/services/taskService.test.ts`.

## Test Structure

Use `describe` blocks named after the function or module under test. Use `it`
(not `test`) for individual cases. Group related assertions in a single `it`
block when they test the same behavior.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from './taskService.js';

describe('TaskService.create', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates a task with valid input and returns the new task', async () => {
		const input = { title: 'Write tests', priority: 'high' };
		const result = await TaskService.create(input);

		expect(result).toMatchObject({
			title: 'Write tests',
			priority: 'high',
			done: false
		});
		expect(result.id).toBeDefined();
		expect(result.createdAt).toBeInstanceOf(Date);
	});

	it('throws an AppError when the title is empty', async () => {
		await expect(TaskService.create({ title: '', priority: 'low' })).rejects.toThrow(
			'Title is required'
		);
	});
});
```

## Mocking

Mock external dependencies at the module level with `vi.mock()`. Prefer mocking
the dependency boundary (e.g., the database client) rather than internal functions.

```typescript
import { describe, it, expect, vi } from 'vitest';

vi.mock('../utils/db.js', () => ({
	db: {
		query: vi.fn()
	}
}));

import { db } from '../utils/db.js';
import { TaskService } from './taskService.js';

describe('TaskService.findById', () => {
	it('returns the task when found', async () => {
		const mockTask = { id: '1', title: 'Test', done: false };
		vi.mocked(db.query).mockResolvedValueOnce({ rows: [mockTask] });

		const result = await TaskService.findById('1');
		expect(result).toEqual(mockTask);
		expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['1']);
	});

	it('returns null when the task does not exist', async () => {
		vi.mocked(db.query).mockResolvedValueOnce({ rows: [] });

		const result = await TaskService.findById('missing');
		expect(result).toBeNull();
	});
});
```

## What to Test

Every service function needs at minimum:

- One happy-path test confirming correct output and side effects
- One error-path test confirming proper error handling

Route handlers should be tested via integration-style tests using `supertest`
or by calling the handler function directly with mock req/res objects.

Middleware should be tested in isolation by passing mock `Request`, `Response`,
and `NextFunction` objects.

## Assertions

- Use `expect(x).toEqual(y)` for deep equality on objects and arrays
- Use `expect(x).toBe(y)` for primitive values and referential identity
- Use `toMatchObject` when you only care about a subset of properties
- Use `toThrow` or `rejects.toThrow` for error cases
- Avoid snapshot tests for logic — only use them for stable serialized output

## Test Data

Use factory functions to generate test data rather than duplicating object
literals across tests:

```typescript
function makeTask(overrides: Partial<Task> = {}): Task {
	return {
		id: 'test-id',
		title: 'Default task',
		priority: 'medium',
		done: false,
		createdAt: new Date('2025-01-01'),
		...overrides
	};
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run a specific file
npx vitest run src/services/taskService.test.ts

# Run in watch mode during development
npx vitest

# Run with coverage
npx vitest run --coverage
```
