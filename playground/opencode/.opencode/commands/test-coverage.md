---
description: Run tests with coverage and analyze gaps
arguments:
  - name: target
    description: Specific file or directory to test (defaults to entire project)
    required: false
---

# Test Coverage Analysis

Run the test suite with coverage enabled, then analyze the results to identify
gaps and suggest improvements.

## Steps

1. **Run tests with coverage.** Execute the following command:

   ```
   npx vitest run --coverage $ARGUMENTS
   ```

   If no arguments are provided, run coverage for the entire project.

2. **Parse the coverage output.** Look at the summary table and identify:
   - Files with less than 80% line coverage
   - Files with less than 70% branch coverage
   - Any files with 0% coverage (completely untested)

3. **Read the uncovered files.** For each file below the threshold, read the
   source code and identify which functions or branches lack tests.

4. **Produce a report** with the following sections:

### Coverage Summary

A brief table showing overall line, branch, and function coverage percentages.

### Gaps

For each under-covered file, list:

- The file path and current coverage percentage
- The specific functions or branches that are untested
- Why they matter (e.g., "this handles the error path for invalid input")

### Suggested Tests

For each gap, write a concrete test description (the `it("...")` string) that
would cover it. Group by file. Example:

- `src/services/taskService.ts` (62% lines)
  - `it("throws ValidationError when title exceeds 200 characters")`
  - `it("returns empty array when no tasks match the filter")`

### Quick Wins

Highlight any files where a single additional test would meaningfully improve
coverage (e.g., testing an error branch bumps a file from 70% to 95%).

Do not write the actual test code unless asked — just provide the analysis.
