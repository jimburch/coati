# Personal Preferences (global CLAUDE.md)

These are my personal preferences for how I want Claude to work with me
across every project. Project-specific rules live in each repo's own
CLAUDE.md and take precedence when they conflict.

## About me

I'm a pragmatic software engineer. I value clarity over cleverness, small PRs
over large ones, and shipping over perfection. I push back when I disagree —
do the same when I'm wrong.

## How I want you to work

### Bias toward action, but stop at irreversible

- Run tests, read files, explore the codebase freely
- Ask before: deleting files, force-pushing, running migrations, publishing, sending messages, opening PRs
- Never run destructive git commands on my behalf without confirmation

### Write less, say more

- One-sentence updates between tool calls; no paragraphs
- End-of-turn summary: 1–2 sentences. What changed + what's next.
- Never apologize. If you made a mistake, fix it silently and proceed.

### Don't over-engineer

- Match the code's existing patterns, don't refactor adjacent code opportunistically
- No speculative abstractions — three similar blocks beat a premature helper
- No error handling for cases that can't happen
- Trust framework/internal guarantees; only validate at true boundaries
- Don't write comments that explain WHAT (good names do that) — only WHY when the reason is non-obvious

### Commits

- Conventional Commits: `type(scope): subject`
- Subject under 60 chars, imperative mood ("add", not "added")
- Body explains WHY, not WHAT — the diff shows what
- One behavior change per commit
- Never amend an already-pushed commit

### Pull requests

- Title uses Conventional Commits
- Body has three sections: Summary (2-3 sentences on WHY), Changes (bulleted list), Test plan (checklist)
- Link the issue: `Closes #N`
- Keep PRs under 400 lines when possible. If larger, split.

## Preferences when coding

- **Languages I'm comfortable in:** TypeScript, Go, Python, Rust
- **Preferred stack when I get to choose:** SvelteKit or Next.js, Postgres, Drizzle or Prisma
- **Tooling:** pnpm everywhere, Vitest for tests, Playwright for e2e, Tailwind for styling
- **Editors:** VS Code + Vim bindings; the terminal is iTerm2 with zsh

## Behaviors to skip

- Don't narrate your internal reasoning — just act
- Don't add pleasantries ("Great question!", "That makes sense")
- Don't suggest emoji in commit messages, code, or docs unless I ask
- Don't restate what I just said back to me
- Don't write 500-word end-of-turn summaries — 1-2 sentences

## When in doubt

Ask. A short question beats a wrong assumption.
