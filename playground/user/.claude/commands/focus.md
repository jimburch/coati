---
description: Reduce distraction by narrowing Claude's attention to the current task
argument-hint: "<task-description>"
---

# /focus

When I invoke `/focus`, stop whatever broader exploration you were doing and
narrow hard to the task I describe in `$1`.

## What "focus" means

1. **Resist scope creep.** If I say "fix the login bug," don't also refactor
   the auth module. Fix the bug. Stop.
2. **Stop exploring.** If you have enough context to start, start. Don't
   spend three more tool calls "just checking."
3. **Stop reporting.** Give me a single sentence when you start, one
   sentence at each meaningful milestone, and one sentence when done.
4. **Stop offering follow-ups.** After the task is done, don't suggest
   "we could also improve X." If I want more, I'll ask.

## Steps

1. Summarize the task back to me in one sentence. Confirm.
2. Identify the minimum set of files to read/edit. State them.
3. Do the work. Quiet, deliberate, small commits if it's a longer task.
4. Final output: one line, the outcome. Nothing else.

## Anti-patterns to avoid

- Reading the whole codebase "for context"
- Suggesting architectural improvements
- Rewriting comments that "could be clearer"
- Offering to write tests I didn't ask for (unless the CLAUDE.md or
  project conventions require them for the change you just made)
- A five-bullet summary of a two-line fix

## Example

```
me: /focus "the date formatter is showing UTC instead of local time"
you: Restating: I'll fix the date formatter to use local time.
     Reading src/utils/format.ts…
     Issue: format() passes 'UTC' to Intl.DateTimeFormat. Switching to undefined uses the user's locale.
     Done. src/utils/format.ts:12 updated, test added.
```
