# Guided Refactoring

Analyze the selected code and propose a step-by-step refactoring plan.

## Analysis

1. Identify code smells: long functions, deep nesting, duplicated logic, unclear naming
2. Check for violations of project conventions (see .cursor/rules/)
3. Assess coupling — does this code depend on too many external modules?
4. Look for opportunities to use TypeScript features: discriminated unions, generics, utility types

## Refactoring Plan

For each proposed change:

1. **What**: describe the refactoring (extract function, introduce interface, simplify conditional, etc.)
2. **Why**: explain the benefit (readability, testability, type safety, performance)
3. **How**: show the before and after code
4. **Risk**: note if this change could break existing tests or callers

## Constraints

- Preserve the public API — do not change function signatures used by other modules
- Maintain or improve test coverage — suggest new tests if behavior changes
- Make changes incrementally — each step should leave the code in a working state
- Prefer small, focused changes over large rewrites
