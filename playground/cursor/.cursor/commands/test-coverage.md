# Test Coverage Analysis

Run the test suite with coverage reporting and analyze the results.

## Steps

1. Run `npx vitest run --coverage` to generate a coverage report
2. Identify files with less than 80% line coverage
3. For each under-covered file, identify the uncovered branches and lines
4. Suggest specific test cases that would improve coverage for the most critical gaps

## Focus Areas

- Prioritize coverage gaps in `src/services/` and `src/routes/` over utilities
- Pay special attention to error handling paths — these are often untested
- Highlight any functions with 0% coverage that contain business logic

## Output Format

Provide a summary table:
| File | Lines | Branches | Uncovered Areas |
|------|-------|----------|-----------------|

Then list 3-5 specific test cases to write, ordered by impact on overall coverage.
