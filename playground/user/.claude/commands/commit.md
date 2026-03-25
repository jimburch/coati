# Smart Commit

Generate a conventional commit message for the current staged changes.

## Steps

1. Run `git diff --cached` to see all staged changes
2. Analyze the changes and determine:
   - **Type**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`
   - **Scope**: the module or area affected (optional, in parentheses)
   - **Subject**: short imperative description, max 72 chars, no trailing period
3. Check if the changes span multiple concerns — if so, suggest splitting the commit
4. Propose the commit message in this format:

   ```
   <type>(<scope>): <subject>

   <optional body: bullet points explaining non-obvious changes>
   ```

5. Ask for confirmation before running `git commit -m "..."`

## Rules

- Subject line: imperative mood ("add feature" not "added feature"), lowercase, no period
- Body lines: max 100 chars, start each bullet with `- `
- Never include "WIP" or "TODO" in the commit message
- If there are unstaged changes relevant to the diff, mention them
