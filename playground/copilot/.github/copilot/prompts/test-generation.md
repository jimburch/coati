# Test Generation

Generate comprehensive Vitest tests for the provided code. Follow the project's testing conventions exactly.

## Setup

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

Mock all external dependencies at the top of the file using `vi.mock()`. Reset mocks in a `beforeEach` block with `vi.clearAllMocks()`.

## Structure

Organize tests using nested `describe` blocks:

```
describe("functionName")
  describe("when input is valid")
    it("should return the expected result")
    it("should call the repository with correct params")
  describe("when input is invalid")
    it("should return a validation error")
  describe("when the dependency fails")
    it("should propagate the error with context")
```

## What to Test

For each function, generate tests covering:

1. **Happy path** — typical valid input produces expected output
2. **Boundary values** — empty strings, zero, max values, single-element arrays
3. **Invalid input** — wrong types, missing required fields, malformed data
4. **Error propagation** — what happens when a dependency throws or returns an error
5. **Side effects** — verify that the correct downstream functions were called with expected arguments

## Conventions

- Test descriptions start with "should" and describe behavior, not implementation
- One assertion per test when possible; multiple assertions are fine if testing a single logical outcome
- Use `toEqual` for objects and arrays, `toBe` for primitives and references
- For async functions, use `async/await` — do not use `.resolves` or `.rejects` matchers
- Use `vi.fn()` to create mock functions and assert calls with `toHaveBeenCalledWith`
- Create factory functions for test data instead of repeating object literals

## Test Data Factories

Generate a factory helper at the top of the test file:

```typescript
function createUser(overrides: Partial<User> = {}): User {
	return {
		id: crypto.randomUUID(),
		name: 'Test User',
		email: 'test@example.com',
		createdAt: new Date('2025-01-01'),
		...overrides
	};
}
```

## Output

Generate the complete test file ready to run. Include all imports, mocks, factories, and test cases. The file should pass `vitest run` without modifications.
