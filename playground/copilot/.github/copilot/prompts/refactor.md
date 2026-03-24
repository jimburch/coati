# Refactor

Refactor the provided code to improve clarity, reduce duplication, and align with the project's conventions. Preserve all existing behavior — this is a pure refactor with no feature changes.

## Goals

1. **Extract duplicated logic** into shared utility functions
2. **Simplify complex conditionals** using early returns and guard clauses
3. **Break large functions** into smaller, focused functions (target: under 25 lines each)
4. **Improve naming** so that variables, functions, and types clearly express intent
5. **Strengthen types** — eliminate `any`, narrow unions, add `readonly` where appropriate

## Process

### Step 1 — Identify Issues

List each refactoring opportunity with:

- What the current code does
- Why it's a problem (readability, duplication, fragility)
- What the improved version looks like

### Step 2 — Plan Changes

Describe the changes in order. Call out:

- New functions or types being introduced
- Functions being renamed or moved
- Any changes to the public API (there should ideally be none)

### Step 3 — Apply Refactoring

Produce the refactored code in full. Do not leave `// ...` placeholders — output complete, runnable files.

## Rules

- Do NOT change behavior. If a function currently returns `null` on failure, keep that contract.
- Do NOT add new dependencies or libraries.
- Do NOT change the function signatures of exported functions (internal helpers can change freely).
- Do NOT combine refactoring with bug fixes — flag bugs separately.
- Preserve all existing test coverage. If tests reference internal helpers that changed, update the tests too.

## Patterns to Apply

- Replace `if/else` chains with early returns
- Replace `switch` statements with lookup objects where appropriate
- Extract inline callbacks into named functions
- Convert repeated `try/catch` blocks into a shared error-handling wrapper
- Use `Array.map`/`filter`/`reduce` over imperative loops when the transform is simple
- Prefer `const` assertions for literal objects used as configuration

## Output Format

Provide:

1. A summary of all changes made (bulleted list)
2. The complete refactored file(s)
3. Notes on any bugs or design concerns discovered during the refactor (but not fixed)
