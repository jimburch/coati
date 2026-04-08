# Test Coverage Analysis

Run the test suite with coverage enabled and identify gaps that need attention.

## Steps

1. Run `npx vitest run --coverage` to generate a coverage report
2. Parse the coverage summary and identify:
   - Files with **less than 80% line coverage**
   - Any **uncovered functions** in service files (`src/services/`)
   - Any **uncovered branches** in middleware (`src/middleware/`)
3. For each under-covered file, read the source and the existing tests, then:
   - List the specific untested code paths (e.g., "error branch on line 42 when user is not found")
   - Suggest concrete test cases that would cover the gap
4. Prioritize coverage gaps by impact:
   - **High:** Uncovered error handling or auth checks
   - **Medium:** Uncovered business logic branches
   - **Low:** Uncovered utility helpers or logging

Output a summary table with columns: File, Current Coverage, Target, Priority, Suggested Tests.
