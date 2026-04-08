# Code Review

Review the selected code for quality, correctness, and adherence to project conventions.

## Checklist

1. **Type Safety** — Are there any uses of `any`, unsafe type assertions, or missing null checks?
2. **Error Handling** — Are errors caught, logged, and returned in the standard `{ error, code }` format?
3. **Input Validation** — Is all external input (request body, params, query) validated with Zod?
4. **Naming** — Are variables, functions, and types named clearly and consistently?
5. **Complexity** — Are functions under 30 lines? Should any logic be extracted into helpers?
6. **Security** — Are there SQL injection risks, exposed secrets, or missing auth checks?
7. **Tests** — Are there corresponding tests? Do they cover error paths and edge cases?

## Output Format

For each issue found, provide:

- **File and line**: where the issue is
- **Severity**: critical / warning / suggestion
- **Description**: what the problem is
- **Fix**: concrete code change to resolve it

If the code looks good, say so and note any minor improvements that could be made.
