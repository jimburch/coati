# Launch Posts — Coati

Drafts for three moments: **Waitlist Teasers** (landing page, March 31), **Waitlist Nurture Emails** (April 1-14), and **Platform Launch** (mid-April).

## Pre-Launch Assets Checklist

Before posting anything, these assets need to exist:

- [ ] **Demo GIF** — terminal recording of `npx @coati/sh@latest clone jimburch/fullstack-claude` completing in ~10 seconds, showing files landing in place. This is the single highest-impact asset — prioritize above all else.
- [ ] **Demo screenshot** — the setup detail page on coati.sh with file tree, README preview, and clone command visible
- [ ] **Short-form video (30-60s)** — screen recording of the full flow: browse explore page, click a setup, copy the clone command, run it in terminal, see files appear. Post natively to Twitter/X, LinkedIn, and YouTube Shorts.
- [ ] **"Clone on Coati" badge** — SVG/PNG badge for GitHub READMEs (like npm version badges). Links to setup page. Seed setups and influencer setups should include this in their README from day one.
- [ ] **3-5 beta testers lined up** — devs who've tried Coati and can comment on launch posts or be quoted
- [ ] **Seed setups published** — at minimum: "The Minimalist," "The MCP Power User," and "The TypeScript Fullstack Starter" from the seed content plan
- [ ] **Waitlist email sequence drafted** (see Phase 1B below)
- [ ] **Waitlist referral mechanism** — after signup, give each person a unique referral link. Referrals move them up the early-access list. Even a simple "share this link" page after signup creates a viral loop.

---

## Phase 1A: Landing Page / Waitlist Teasers

### LinkedIn

> Every week someone posts their Claude Code workflow on Twitter and the replies are all the same: "How do I set this up?"
>
> Then comes the 30-minute treasure hunt. Copy this config. Install that MCP server. Hope you didn't miss a step in screenshot number seven.
>
> I'm building Coati — one command to clone any developer's complete AI coding setup to your machine. Configs, scripts, tool integrations, documentation. Everything lands in the right place.
>
> Instead of sending someone 5 links and a wall of instructions, you send them one command.
>
> We're launching in April. Sign up for early access — first 100 users help shape what we build:
> [link]
>
> (Refer a friend and move up the list.)

---

### Twitter/X

**Thread format:**

> 1/ Every day on this app someone shares an incredible AI coding workflow.
>
> And every day, the top reply is: "This looks amazing. How do I actually set this up?"
>
> I'm building the answer.

> 2/ Coati packages your entire AI workflow — CLAUDE.md, MCP servers, custom skills, configs, scripts — into a single shareable setup.
>
> Other developers clone it to their machine with one command. Done.

> 3/ Browse what other developers are building. Find a setup that matches your stack. Clone it.
>
> No blog posts to follow. No screenshots to squint at. No "step 4 of 12."
>
> Launching in April. Grab early access (refer a friend to move up the list):
> [link]

---

### Indie Hackers

**Title:** I'm building a platform for sharing AI coding workflows — would you use this?

> Hey IH,
>
> I've been deep in the AI coding tool world (Claude Code, Cursor, Copilot) and noticed a gap: developers are building powerful workflows, but sharing them is a mess. You end up copy-pasting from blog posts and screenshots, manually configuring tools, and hoping you didn't miss a step.
>
> I'm building Coati — a platform where you package your complete AI dev setup (configs, scripts, tool integrations, skills, docs) and share it with a link. Other devs clone the whole thing with a single CLI command.
>
> Think of it like GitHub repos, but for your AI coding environment.
>
> Still building, but I'd love early feedback:
>
> - Would you use this to share your own setup, to discover others' setups, or both?
> - What AI coding tools are you using day to day?
>
> Waitlist for early access: [link]

---

### Discord / Slack Communities (Claude, Cursor, dev communities)

> Hey all — I just published my Claude Code setup on a platform I'm building called Coati. It's got my CLAUDE.md, 4 MCP server configs, custom skills, and hooks — the full workflow I've been using for months.
>
> Anyone can clone it with one command:
>
> ```
> npx @coati/sh@latest clone jimburch/fullstack-claude
> ```
>
> Everything lands in the right place. No manual setup, no copying snippets from a blog post.
>
> The idea is a platform where we all share complete workflows like this and clone each other's setups. Launching soon — sign up if you want early access: [link]

---

---

## Phase 1B: Waitlist Nurture Emails

Send 2-3 emails between waitlist signup and platform launch to build anticipation and prime engagement.

### Email 1 — Welcome + What's Coming (immediately after signup)

**Subject:** You're on the list. Here's what we're building.

> Hey {name},
>
> Thanks for signing up for Coati. Here's the short version of what you're getting access to:
>
> **The problem:** Sharing your AI coding workflow today means writing a blog post, sharing screenshots, and hoping people can piece it together.
>
> **What Coati does:** Package your complete setup — configs, scripts, MCP servers, skills, docs — and let anyone clone it with one CLI command.
>
> I'm building this because I got tired of writing "here's how to recreate my workflow" messages. Now it's just `npx @coati/sh@latest clone jimburch/fullstack-claude`.
>
> I'll email you once more before launch with a preview of what's on the platform. Reply to this email if there's a specific setup you'd want to find on day one — it'll shape what I build.
>
> — Jim

### Email 2 — Sneak Peek + Seed Setups (1 week before launch)

**Subject:** First look: setups you can clone on day one

> Hey {name},
>
> Coati launches next week. Here's a preview of what you'll find:
>
> - **The Minimalist** — a clean, opinionated Claude Code setup. CLAUDE.md, no extras. A starting point for anyone new to AI coding agents.
> - **The MCP Power User** — 6 MCP servers, custom statusline, multiple skills. The full setup of someone who lives in the terminal.
> - **The TypeScript Fullstack Starter** — tuned for SvelteKit/Next.js projects with testing patterns and linting integration.
>
> [Screenshot of a setup detail page]
>
> You'll be able to browse all of these on the web and clone any of them with one command. I'll send the launch link as soon as it's live.
>
> — Jim

### Email 3 — Launch Day (see Phase 2 posts for content)

---

---

## Phase 2: Platform Launch

### Hacker News — Show HN

**Title:** Show HN: Coati — Clone any developer's AI coding workflow with one command

> Install the CLI:
>
>     npm install -g @coati/sh
>
> Clone a setup:
>
>     npx @coati/sh@latest clone jimburch/fullstack-claude
>
> That pulls down my entire Claude Code workflow — CLAUDE.md, MCP server configs, custom skills, hooks, and scripts — and places everything where it belongs. Conflict resolution built in.
>
> Coati is a platform for sharing complete AI dev workflows. The web app (coati.sh) has profiles, stars, comments, and discovery. The CLI handles cloning, publishing, and search.
>
> The problem this solves: someone shares their Claude Code or Cursor setup on social media, and recreating it means hunting through screenshots and manually copying configs. Coati makes that a one-liner.
>
> Publishing is just as quick. Run `coati init` in your project and it auto-detects your AI config files (CLAUDE.md, .cursorrules, MCP configs, skills, hooks). Confirm what to include, then `coati publish`.
>
> All setups are public — the whole point is sharing. Browse what's there, clone something, publish your own.
>
> Try it: [link]

**Notes for posting:**

- Post Tuesday-Thursday, 8-10am ET
- Block the entire day for comment responses — reply within minutes for the first 2-3 hours
- Have technical answers ready (architecture, security model, why SvelteKit, how file placement works)

---

### Reddit — r/ClaudeCode

**Title:** I built a platform to share and clone complete Claude Code setups with one command

> I've been tweaking my Claude Code workflow for months — custom CLAUDE.md, MCP servers, hooks, skills, the works. Every time someone asks me to share it, I end up writing a wall of text explaining how to set everything up.
>
> So I built Coati. You package your full setup and publish it. Anyone can run `npx @coati/sh@latest clone jimburch/fullstack-claude` and get everything installed on their machine.
>
> It handles:
>
> - CLAUDE.md and config files
> - MCP server configurations
> - Custom skills and hooks
> - Scripts and documentation
> - File placement and conflict resolution
>
> There's a web app for browsing, starring, and discovering setups from other developers.
>
> Publishing is just as easy. Run `coati init` in your project directory and it auto-detects your CLAUDE.md, MCP configs, skills, and hooks. Then `coati publish` and your setup is live.
>
> I've published my own fullstack setup — try `npx @coati/sh@latest clone jimburch/fullstack-claude` and see how it feels. Would love for people to publish their own too.
>
> [link]

---

### Reddit — r/cursor

**Title:** Built a way to share complete Cursor setups — .cursorrules, configs, and all

> Whenever someone shares their Cursor setup here, the comments are full of "can you share your .cursorrules?" and "how did you configure X?" — then you're back to copying snippets and hoping you got everything.
>
> I built Coati to fix this. Package your entire Cursor workflow — .cursorrules, AI configs, scripts, whatever makes your setup tick — into a shareable unit. Other devs clone it with one command and everything lands in the right place.
>
> It works with any AI coding tool: Cursor, Claude Code, Copilot. The point is capturing the whole workflow, not just one config file.
>
> ```
> npx @coati/sh@latest clone username/cursor-react-setup
> ```
>
> Check it out: [link]

---

### Reddit — r/programming, r/webdev, r/SideProject

**Title:** I built Coati — share and clone AI dev workflows like GitHub repos

> AI coding tools (Claude Code, Cursor, Copilot) are changing how developers work, but sharing a complete workflow is still painful. Blog posts full of scattered config snippets that people have to manually piece together.
>
> Coati packages your entire AI setup — configs, scripts, tool integrations, skills, docs — into a single "setup" that anyone can clone with one CLI command.
>
> Think dotfiles, but purpose-built for AI workflows, with a discovery layer on top.
>
> Built with SvelteKit, PostgreSQL, TypeScript. CLI published on npm.
>
> [link]

---

### Twitter/X

> 1/ Coati is live.
>
> Share your complete AI coding workflow. Clone anyone else's with one command.
>
> `npm install -g @coati/sh`
> `npx @coati/sh@latest clone jimburch/fullstack-claude`
>
> [link]

> 2/ I kept finding great Claude Code and Cursor setups on this app. Recreating them took 30 minutes of copying configs and installing tools and hoping I didn't miss something.
>
> So I built a way to skip all that.

> 3/ A "setup" on Coati packages everything — CLAUDE.md, MCP configs, custom skills, hooks, scripts, docs. Clone it and everything lands in the right place.
>
> [demo GIF]

> 4/ Want to share your own setup? Run `coati init` — it auto-detects your CLAUDE.md, MCP configs, skills, and hooks. Then `coati publish`.
>
> Your setup gets a page on coati.sh with a README, file browser, stars, and comments.
>
> [screenshot of setup detail page]

> 5/ It's free. All setups are public. I just want to make it easier for devs to share what they've built.
>
> Try it and let me know what you think: [link]

---

### LinkedIn

> Two weeks ago I opened the Coati waitlist. 200 developers signed up.
>
> Today it's live.
>
> Coati is a platform where developers share and clone complete AI coding workflows. The AI tool ecosystem — Claude Code, Cursor, Copilot — is growing fast, but sharing a workflow is still stuck in the screenshot era. Someone posts their setup, and if you want to use it, you're manually copying configs and troubleshooting for 30 minutes.
>
> Now it's one command:
>
> `npx @coati/sh@latest clone username/setup-name`
>
> Configs, scripts, tool integrations, custom skills, documentation — everything lands where it belongs.
>
> The platform has discovery, profiles, stars, comments, and trending setups. The CLI handles cloning, publishing, and search.
>
> I built this because I kept wanting to share my own workflow and there was no clean way to do it.
>
> Try it: [link]
> Install the CLI: `npm install -g @coati/sh`

**Note:** Adjust the "200 developers" number to the actual waitlist count at launch. If significantly lower, reframe the opener around what you learned from early testers instead.

---

### Dev.to

**Title:** I built Coati — a platform for sharing AI coding workflows. Here's why and how.

> ## The Problem
>
> Developers are building powerful workflows with Claude Code, Cursor, and Copilot. Custom CLAUDE.md files, chains of MCP servers, hooks, skills, editor configs — real systems that make them dramatically more productive.
>
> But sharing these workflows is a mess. You write a blog post. You share screenshots. Someone asks "how do I set this up?" and you spend 20 minutes walking them through it. Half the time something breaks because they missed a step.
>
> Dotfiles repos exist, but they weren't built for AI tooling. They don't capture MCP configurations, custom skills, or the context that makes a workflow actually work.
>
> ## What I Built
>
> Coati is a platform where developers package their complete AI setup and share it with a link. Anyone can clone it with one command:
>
> ```bash
> npx @coati/sh@latest clone jimburch/fullstack-claude
> ```
>
> [demo GIF of the clone flow]
>
> A "setup" on Coati includes everything: config files, scripts, MCP server configs, custom skills, hooks, and documentation. The CLI handles file placement and conflict resolution.
>
> Publishing your own is fast — run `coati init` in your project directory and it auto-detects your CLAUDE.md, .cursorrules, MCP configs, skills, and hooks. Confirm what you want to include, then `coati publish`.
>
> The web platform has profiles, discovery, stars, comments, and trending setups — so you can browse what other developers are building and find workflows that match your stack.
>
> ## What I Learned Building This
>
> A few things that surprised me along the way:
>
> - **File conflict resolution is harder than it sounds.** When someone clones a setup and already has a CLAUDE.md, you can't just overwrite it. Coati diffs and merges, or asks.
> - **People care more about the "why" than the "what."** The most popular seed setups aren't the ones with the most files — they're the ones with the best README explaining the philosophy behind the workflow.
> - **The AI tooling ecosystem is fragmenting fast.** Claude Code, Cursor, Copilot, Codex, OpenCode — everyone's setup looks different, and that's exactly why a sharing platform makes sense.
>
> ## Tech Stack
>
> For the nerds (myself included):
>
> - **Framework:** SvelteKit (SSR for public pages, SPA for authenticated)
> - **Database:** PostgreSQL with Drizzle ORM
> - **Auth:** GitHub OAuth via Lucia + Arctic
> - **CLI:** TypeScript + Commander, published on npm
> - **Deployment:** DigitalOcean (PM2 + Caddy)
>
> ## Try It
>
> The platform is live at [link]. Install the CLI with `npm install -g @coati/sh`.
>
> I've published several starter setups covering different tools and use cases. Would love feedback — and would love to see your setups on there.

---

### Product Hunt

**Tagline:** Dotfiles for the AI age — browse, clone, and share complete dev workflows

**Description:**

> Coati is where developers share their complete AI coding setups. Package your CLAUDE.md, MCP servers, custom skills, configs, and scripts into a shareable setup. Anyone can clone it with `npx @coati/sh@latest clone username/setup`.
>
> Browse trending setups, discover new workflows, and level up your AI coding environment.

**Maker Comment:**

> Hey Product Hunt — I built Coati because I kept running into the same problem: I'd find an amazing AI coding workflow on Twitter or Reddit, and recreating it took forever.
>
> Coati makes sharing your complete workflow as easy as pushing a repo. The CLI handles everything — file placement, conflict resolution, the works.
>
> I'd love your feedback. What setups would you want to find on here?

**Product Hunt prep notes:**

- Launch on a Tuesday, Wednesday, or Thursday
- Line up 10+ supporters to engage on launch day before posting
- Have a 30-60 second demo video ready showing the clone flow
- Respond to every comment throughout the day
- Direct all traffic back to coati.sh for signups

---

---

## Borrowed Channel Plays

These are in addition to the posts above. The goal is to tap into other people's audiences to accelerate launch reach.

### Influential Dev Outreach

Identify 3-5 developers who regularly post about their AI coding workflows on Twitter/X or YouTube. Reach out with:

> Hey [name] — I've been following your Claude Code / Cursor content and really liked [specific post]. I'm building Coati, a platform for sharing complete AI dev workflows. I'd love to create a setup on Coati from your workflow so your followers can clone it with one command instead of manually recreating it.
>
> No commitment needed — I'll do the packaging work. If you like how it turns out, you could share the link. If not, no worries.

The goal: get 2-3 high-profile setups on the platform at launch with the creator willing to share the link.

### Newsletter Pitches

Target devtools-focused newsletters:

- **TLDR** (tldr.tech) — devtools section
- **DevTools Weekly**
- **Bytes** (bytes.dev)
- **Console** (console.dev) — curates new devtools

Pitch angle: "New open platform for sharing AI coding workflows — like GitHub for your dev environment setup."

### Community Spotlights

- **Claude Developers Discord** — ask mods about a community spotlight or demo session
- **Anthropic devrel** — pitch a blog post or tweet collaboration ("Here's how Claude Code users are sharing workflows")

### "Clone on Coati" Badge (Passive Growth)

Create an embeddable badge (like npm version badges or "Deploy to Heroku" buttons) that setup creators can add to their GitHub READMEs:

```markdown
[![Clone on Coati](https://coati.sh/badge/jimburch/fullstack-claude.svg)](https://coati.sh/jimburch/fullstack-claude)
```

Every README that includes this badge becomes a permanent referral channel. Prioritize getting this into:

- All seed setups
- Any influencer setups you help create
- Your own repos

---

## Launch Day Engagement Plan

### HN Day (Primary Launch)

| Time             | Action                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| 8:00 AM ET       | Post Show HN                                                                 |
| 8:00-11:00 AM    | Respond to every comment within minutes. Be technical, honest, concise.      |
| 11:00 AM-2:00 PM | Continue monitoring, respond within 15 min. Share on Twitter that it's live. |
| 2:00-6:00 PM     | Post to r/ClaudeCode and r/cursor. Continue HN engagement.                   |
| 6:00 PM+         | Wind down. Send launch email to waitlist.                                    |

### Reddit Day (Day 2)

- Post to r/programming, r/webdev, r/SideProject
- Engage with every comment
- Cross-reference the HN discussion if it went well ("got great feedback on HN yesterday, wanted to share here too")

### Content Day (Days 3-5)

- Publish Dev.to article
- Post Twitter/X launch thread
- Post LinkedIn launch announcement
- Ask beta testers to share their own posts/comments

### Product Hunt + Alternatives (Week 2)

- Execute PH launch with pre-built supporter list
- Direct all PH traffic to coati.sh signup
- Follow up with every commenter via DM
- Same week, submit to **free launch directories** that require minimal effort:
  - **BetaList** (betalist.com) — submit as early-stage product
  - **Launching Next** (launchingnext.com) — free startup directory
  - **AlternativeTo** (alternativeto.net) — list as alternative to dotfiles managers
  - **Console** (console.dev) — curated devtools newsletter/directory
  - **Uneed** (uneed.best) — indie product directory

### Content Repurposing (Week 2-3)

Turn the Dev.to article into multiple formats to extend its reach without writing new material:

- **Twitter/X thread** — extract the "What I Learned" section into a standalone thread
- **LinkedIn article** — repost the full Dev.to piece natively on LinkedIn
- **YouTube short / TikTok** — the demo GIF, but narrated (30-60 seconds)
- **Reddit comment replies** — when people ask "how do I share my Claude Code setup?" in any subreddit, link to the Dev.to article or directly to Coati

### Comment Marketing (Ongoing from Week 1)

Proactively add value in threads where people are sharing or asking about AI coding workflows — without being spammy.

**Where to watch:**

- r/ClaudeCode — any "share your setup" or "what's in your CLAUDE.md" threads
- r/cursor — any "share your .cursorrules" threads
- Twitter/X — search "claude code setup," "cursor workflow," "share my AI setup"
- Claude Discord — #show-your-setup or similar channels

**Template response (adapt to context):**

> Nice setup. If you want to make it one-click for people to clone, you could publish it on Coati — `coati init` auto-detects your config files and `coati publish` makes it shareable. Then people just run `npx @coati/sh@latest clone your-username/setup-name`.

The goal is to be genuinely helpful, not promotional. Only comment when it's actually relevant.
