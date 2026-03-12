# Go-to-Market Strategy

## Positioning

**One-liner:** "Share, discover, and clone complete AI dev workflows — like GitHub repos for your setup." 🐦‍⬛

**Elevator pitch:** Developers are building incredible AI coding workflows with Claude Code, Cursor, Codex, and MCP servers, but there's no good way to share them. Magpie lets you package your entire AI setup — configs, scripts, skills, hooks, and docs — and share it with one link. Other developers can clone it to their machine with a single CLI command. Think dotfiles, but for the AI age.

**What we are NOT:**
- Not another dotfiles manager (those exist but have no community/discovery layer)
- Not a skills marketplace (SkillsForge does individual skills, not full workflows)
- Not a workflow automation tool (n8n, Zapier do that)
- Not a code editor or AI assistant

**What we ARE:**
- The place where you share your complete AI development workflow
- A discovery platform for learning how other developers use AI tools
- A one-command install experience for adopting someone else's setup

## Target Audience

### Primary: CLI-first developers using AI coding agents
- Already using Claude Code, Codex CLI, or OpenCode
- Comfortable in the terminal
- Likely already have dotfiles on GitHub
- Active on r/ClaudeCode, Hacker News, Twitter devtools community
- 50-200K developers globally (growing fast)

### Secondary: IDE-based developers curious about AI workflows
- Using Cursor, Windsurf, Copilot
- May not publish setups but will browse and clone them
- Larger audience (millions) but lower engagement

### Tertiary: Developer content creators
- Write blog posts about their AI workflows
- Would love a platform to host and link to their setup
- Force multiplier for marketing

## Seed Content Strategy

An empty platform is a dead platform. Before any public launch, seed with 5-10 high-quality setups that represent different personas:

1. **"The Minimalist"** — clean, opinionated Claude Code setup with minimal settings, a focused CLAUDE.md, and no extras. For devs who want a starting point.

2. **"The MCP Power User"** — 6-8 MCP servers (GitHub, Postgres, filesystem, Slack), custom statusline, multiple skills. Shows the full potential.

3. **"The Cursor + Claude Hybrid"** — both .cursorrules and CLAUDE.md, explains when to use which tool, how they complement each other.

4. **"The OpenCode Local-First Setup"** — for privacy-conscious devs running local models. Shows OpenCode config, local MCP servers.

5. **"The TypeScript Fullstack Starter"** — opinionated CLAUDE.md for Next.js/SvelteKit projects, includes testing patterns, linting integration.

6. **"The Python Data Science Setup"** — CLAUDE.md tuned for pandas/jupyter workflows, MCP connections to databases.

7. **"The DevOps & Infra Setup"** — Claude Code configured for Terraform, Docker, CI/CD work. Different persona entirely.

Each seed setup should have:
- A thorough README explaining the philosophy
- At least 3-5 files
- Real, tested configs (not hypothetical)
- Tags and tool markers properly set

## Launch Channels

### Wave 1: Launch Day (highest signal channels)

**Hacker News — "Show HN"**
- Title: "Show HN: Magpie – Share and clone AI dev workflows like GitHub repos"
- Post should be concise, link directly to the platform
- Prepare to respond to comments within minutes
- Best posted Tuesday-Thursday, 8-10am ET

**r/ClaudeCode**
- Share your own setup on Magpie, write a post about it
- Frame as "I built this to solve my own problem sharing my Claude Code workflow"
- Link to the platform naturally

**r/cursor and r/LocalLLaMA**
- Cross-post adapted versions focusing on those communities' tools

### Wave 2: Days 2-5 (content-driven)

**DEV.to Launch Article**
- "I built Magpie — a platform for sharing AI coding workflows. Here's why and how."
- Include architecture details (devs love this)
- Show a real clone flow with terminal screenshots

**Twitter/X Thread**
- Demo GIF: show a `magpie clone` in action
- Tag relevant accounts: Anthropic devrel, Claude Code contributors
- Thread format: problem → what I built → how it works → try it

### Wave 3: Week 2+ (sustained growth)

**Product Hunt**
- Good for a second wave of signups
- Prepare screenshots, tagline, maker comment

**Claude Developers Discord**
- Share in community channels, offer to help people create setups

**YouTube / short-form video**
- 2-minute demo video: "Clone my entire Claude Code workflow in 10 seconds"

## Growth Flywheel

```
Developer creates a great setup
        │
        ▼
Writes about it (blog, Twitter, Reddit)
        │
        ▼
Links to their Magpie profile / setup page
        │
        ▼
New developers discover the platform
        │
        ▼
Browse → Star → Clone setups
        │
        ▼
Experience the magic of `magpie clone`
        │
        ▼
Create and publish their own setups
        │
        ▼
Share THEIR setups (repeat cycle)
```

### Key growth levers:
1. **SEO on setup pages** — every setup page is a long-tail keyword page ("claude code mcp setup typescript", "cursor rules react project")
2. **Embeddable badges** — "Clone my setup on Magpie 🐦‍⬛" badge for READMEs (like npm badges)
3. **CLI virality** — when someone clones a setup, the success message links back to the platform
4. **Content creator incentive** — setup pages replace scattered blog code blocks with a single canonical link

## Success Metrics (First 30 Days)

| Metric | Target | Why it matters |
|--------|--------|----------------|
| Registered users | 200+ | Platform has an audience |
| Published setups | 50+ | Enough content for discovery to feel alive |
| CLI installs (npm) | 500+ | People are trying the core experience |
| Clone events | 100+ | The value prop is working — people are installing setups |
| Repeat visitors | 30%+ | People come back, not just bounce |

## Future Monetization (Not MVP)

The platform launches fully free and open. Potential future models if it gains traction:

- **Pro profiles** — custom domains, analytics dashboard, private setups ($5-10/mo)
- **Team accounts** — shared setups, org profiles, team management ($15-20/seat/mo)
- **Sponsored placements** — tool vendors (Anthropic, Cursor) sponsor featured setups
- **Setup certification** — "verified" badge for setups tested by the community

None of this is built or promised at launch. Focus is entirely on building the community.