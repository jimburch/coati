# Code Review

Review the provided code for quality, security, and maintainability. Evaluate each area below and provide specific, actionable feedback.

## Checklist

### Correctness

- Does the code do what it claims to do?
- Are edge cases handled (null, undefined, empty arrays, zero-length strings)?
- Are async operations properly awaited?
- Are error paths handled — what happens when a dependency fails?

### Type Safety

- Are there any uses of `any` that should be narrowed?
- Are function return types explicitly declared?
- Are union types properly discriminated before access?
- Could `readonly` be applied to immutable data structures?

### Security

- Is user input validated before use (Zod schemas, bounds checks)?
- Are SQL queries parameterized (no string interpolation in queries)?
- Are secrets kept out of code and logs?
- Are auth checks present on protected routes?
- Is sensitive data excluded from API responses (passwords, tokens, internal IDs)?

### Performance

- Are there N+1 query patterns that should be batched?
- Are large datasets paginated?
- Are expensive computations cached where appropriate?
- Could any synchronous file operations be replaced with async versions?

### Maintainability

- Does naming clearly communicate intent?
- Are functions small and single-purpose (under 30 lines preferred)?
- Is there duplicated logic that should be extracted into a utility?
- Are magic numbers replaced with named constants?
- Is the code testable — are dependencies injectable?

## Output Format

For each issue found, provide:

1. **Location**: File and line reference
2. **Severity**: Critical / Warning / Suggestion
3. **Issue**: What the problem is
4. **Fix**: Concrete code change or approach to resolve it

End with a summary: total issues by severity and an overall assessment (approve, request changes, or needs discussion).
