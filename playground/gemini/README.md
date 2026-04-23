# Beacon Docs — Gemini CLI Setup

The public documentation and blog site for Beacon, built on Astro. This
repository ships a complete Gemini CLI configuration: project memory,
context rules, slash commands, shell policies, and skills.

## What's in `.gemini/`

| Path | Purpose |
| --- | --- |
| `settings.json` | Model defaults, token limits, include patterns |
| `commands/new-doc.toml` | Scaffold a new docs page with frontmatter + schema-valid fields |
| `commands/new-post.toml` | Scaffold a new blog post |
| `commands/audit-links.toml` | Run the link checker and triage failures |
| `commands/optimize-images.toml` | Compress images in the diff and swap to `<Image>` where needed |
| `commands/review.toml` | Review the diff against Beacon's content conventions |
| `commands/deploy-check.toml` | Pre-flight checks before deploying to Cloudflare Pages |
| `policies/shell.toml` | Shell allow/deny list |
| `policies/read.toml` | Files Gemini may not read (secrets, drafts) |
| `skills/astro-content/SKILL.md` | Astro content collections patterns |
| `skills/mdx-patterns/SKILL.md` | MDX authoring rules for Beacon |
| `skills/content-seo/SKILL.md` | SEO-focused content rules (titles, descriptions, schema.org) |

## `.geminiignore`

Excludes large binary assets, build output, and draft content from Gemini's
context window.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static output to dist/
pnpm preview    # preview the production build
```
