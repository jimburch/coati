---
description: Review code for quality, correctness, and adherence to project conventions
arguments:
  - name: target
    description: File path or directory to review (defaults to staged changes)
    required: false
---

# Code Review

You are performing a code review on this project. Be thorough but pragmatic.

## Steps

1. **Identify the scope.** If `$ARGUMENTS` specifies a file or directory, focus
   there. Otherwise, review all staged changes (`git diff --cached`).

2. **Check for correctness.** Look for:
   - Logic errors, off-by-one mistakes, unhandled edge cases
   - Missing null/undefined checks
   - Incorrect async/await usage (floating promises, missing error handling)
   - Type safety issues (`any` usage, unsafe casts)

3. **Check conventions.** Verify the code follows the project's coding conventions
   documented in `opencode.md`:
   - Explicit return types on exported functions
   - `const` over `let`, never `any`
   - Files under 150 lines
   - Named exports, no default exports
   - Consistent error/success response shapes

4. **Check tests.** For every changed source file, verify:
   - A corresponding `.test.ts` file exists
   - New code paths have test coverage
   - Test names are descriptive sentences

5. **Check for security concerns:**
   - User input validated before use
   - No secrets or credentials in code
   - No SQL injection vectors (if applicable)
   - Dependencies are well-known and maintained

## Output Format

Organize your findings into three sections:

### Issues (must fix)

Bugs, security problems, or convention violations that need to be addressed.

### Suggestions (should consider)

Improvements to readability, performance, or maintainability.

### Praise

Call out anything well-done — clean abstractions, good test coverage, clear naming.

If everything looks good, say so concisely. Don't manufacture issues.
