---
description: Summarize yesterday's (or last Friday's, if today is Monday) git activity across repos for a standup update
---

# /standup

Generate a standup-friendly summary of what I actually worked on recently.

## Steps

1. Determine the lookback window:
   - Monday → since last Friday 00:00
   - Other weekdays → since yesterday 00:00
2. Run across the current repo (and sibling repos under the parent
   directory if they're also git repos):
   ```
   git log --all --author="$(git config user.email)" \
     --since="<date>" --until="now" --pretty=format:"%h|%s|%ar"
   ```
3. Group commits by:
   - Repo (if multiple)
   - PR (match commits to PRs via `gh pr list --author @me --state all`)
4. Check open PRs authored by me: `gh pr list --author @me --state open`
5. Check assigned issues touched: `gh issue list --assignee @me --state open`

## Output

Produce a standup block I can paste into Slack:

```
**Yesterday (or: Last Friday)**
- Landed <feature / fix> in <repo>#<pr>
- Continued work on <feature> — <what's left>
- Reviewed <n> PRs

**Today**
- Pick up <open PR or issue>
- <anything the open-PR / issue list suggests>

**Blockers**
- <list any open review comments on my PRs that need an answer>
- (or: None)
```

Keep it under 15 lines total. Standup is a heartbeat, not a log.
