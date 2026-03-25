# Global Claude Code Instructions

These instructions apply to **all projects** on this machine. Project-level `CLAUDE.md`
files take precedence over this file when they conflict.

## My Preferences

- Concise responses — lead with the answer, skip preamble and filler
- Prefer `const` over `let`; never use `var`
- TypeScript strict mode everywhere
- Named exports over default exports
- Small, focused functions (under 30 lines)

## Code Style

- Run Prettier before finishing any code change
- Error responses: `{ error: string, code: string }`
- Success responses: `{ data: T }`
- Use `unknown` instead of `any`; narrow with type guards

## Workflow

- Before committing: run lint and type-check
- Write tests for non-trivial logic
- Validate all external input with Zod
- Keep commits atomic — one logical change per commit

## What I Do Not Want

- Don't add unsolicited comments or docstrings to code you didn't change
- Don't summarize what you just did at the end of a response
- Don't add backwards-compatibility shims for code that has no callers
- Don't install new dependencies without asking first
