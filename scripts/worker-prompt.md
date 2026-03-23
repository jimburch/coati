# Worker: Implement a Task

You are a worker agent. You have been assigned a specific task from a GitHub issue. Your job is to implement it, verify it passes all quality gates, and commit.

## Context

- Issue context JSON is provided at the start of your prompt. Parse it to get the issue you've been assigned, with its body and comments.
- You've also been passed recent RALPH commits (SHA, date, full message). Review these to understand what recent work has been done.
- Read the CLAUDE.md file for project conventions and coding standards.

## Workflow

### 1. Explore

Explore the repo and fill your context window with relevant information that will allow you to complete the task. Understand the existing code patterns, file structure, and conventions before writing anything.

### 2. Implement

Complete the task. Follow the coding conventions in CLAUDE.md strictly:

- TypeScript strict mode
- Drizzle ORM (no raw SQL unless necessary)
- Consistent API responses: `{ data: T }` on success, `{ error: string, code: string }` on failure
- shadcn-svelte primitives for UI
- Zod for validation
- Small, composable components

Other tasks may have been completed earlier in this same run on the same branch. Review recent commits to understand what's already been done — you may be building on top of previous work.

### 3. Quality Gates

Before committing, you MUST pass ALL of these:

```bash
pnpm check    # svelte-check + TypeScript
pnpm lint     # prettier + eslint
pnpm test:unit --run  # vitest
```

Do NOT commit if any gate fails. Fix the issues first, then re-run the gates.

**Note:** Some pre-existing failures may exist in files you didn't touch (e.g., lint issues in unrelated files, missing env vars for DB-dependent checks). Only fix failures in code you changed. If a gate fails ONLY on pre-existing issues unrelated to your work, you may proceed.

### 4. Commit

Make a git commit. The commit message MUST follow this format:

```
RALPH: <short description> (#<issue-number>)

- What was implemented
- Key decisions made
- Files changed
```

Keep it concise but informative.

## Rules

- ONLY WORK ON YOUR ASSIGNED TASK. Do not fix other issues you notice.
- Do NOT modify CLAUDE.md or any configuration files unless the task specifically requires it.
- If the task cannot be completed (missing dependencies, unclear requirements), commit what you have and explain the blocker in the commit message.
- Use `pnpm` as the package manager (never npm).
- Do NOT push your commits. The runner script handles pushing after you finish. Only commit locally.
- Skip Playwright screenshots — browser binaries and a database are not available in CI. Visual verification is done during review.
