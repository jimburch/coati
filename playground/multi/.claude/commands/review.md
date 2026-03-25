# Code Review

Review the currently staged git changes and provide actionable feedback.

## Steps

1. Run `git diff --cached` to see all staged changes
2. For each changed file, analyze:
   - **Correctness:** Are there logic errors, off-by-one bugs, or unhandled edge cases?
   - **Types:** Are TypeScript types accurate? Any implicit `any` or unsafe casts?
   - **Style:** Does the code follow the conventions in CLAUDE.md?
   - **Security:** Any SQL injection, unvalidated input, or leaked secrets?
   - **Tests:** Are there corresponding test updates for the changed behavior?
3. Run `npm run lint` and report any new lint errors introduced by the changes
4. Summarize findings as a numbered list, grouped by severity:
   - **Must fix:** Bugs or security issues that need to be resolved before commit
   - **Should fix:** Style violations, missing validation, or unclear naming
   - **Consider:** Suggestions for improvement that are not blocking

If everything looks clean, say so — don't invent issues.
