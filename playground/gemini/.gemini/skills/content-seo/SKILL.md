---
name: Content SEO for Beacon Docs
description: Teaches Gemini Beacon's conventions for titles, descriptions, headings, schema.org annotations, and link hygiene that affect search ranking.
---

# Content SEO

Beacon Docs and blog posts should rank for developer search queries without
sacrificing clarity or voice. These rules are concrete — follow them.

## Titles

- ≤ 60 characters — Google truncates longer titles
- Keyword-led — put the primary keyword in the first 5 words
- Avoid clickbait (`"You won't BELIEVE…"`) — developers bounce
- Use title case for blog posts, sentence case for docs

Good: `"Verify Webhook Signatures in Beacon"`
Bad: `"A Quick Guide to Understanding How to Verify Webhook Signatures"`

## Descriptions

- ≤ 160 characters — enforced by the collection schema
- Include the primary keyword naturally (not stuffed)
- Answer "what will I learn by clicking?" in one sentence
- Written for humans first, crawlers second

Good: `"Verify incoming webhook signatures with HMAC to reject tampered requests and replay attacks."`
Bad: `"Webhook verification, webhook signatures, HMAC verification, webhook security — learn it all here!"`

## Heading structure

- Exactly one H1 per page (from frontmatter `title`)
- H2 for top-level sections — match the reader's likely search intent
- H3 for sub-sections
- Never skip levels (H2 → H4 breaks outline tools and confuses screen readers)
- Keep headings short (≤ 60 chars) — they appear in search-result "jump to section" snippets

## Opening paragraph

The first paragraph is prime real estate. Rules:

- Restate the primary keyword without repeating the title verbatim
- Answer the "what is this?" and "why do I care?" in 2-3 sentences
- Don't bury the lede behind backstory

Good: `"Beacon verifies every webhook via HMAC-SHA256. This guide shows how to compute the expected signature in Node, Python, and Go so you can reject forged requests before they reach your handler."`

Bad: `"Authentication is a deeply important part of any modern web application. In this post, we'll explore the history of HMAC…"`

## Internal linking

- Link to related docs on the first natural mention — not at the bottom of the page
- Use descriptive anchor text: `[webhook verification](./webhooks)` — NOT `[click here](./webhooks)`
- Audit the `related` section at the bottom — 3–5 hand-picked links, not auto-generated

## Schema.org

Every doc page emits `Article` schema via the base layout. Every blog post
emits `BlogPosting` schema. The layout reads from frontmatter:

```jsonld
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{title}}",
  "description": "{{description}}",
  "datePublished": "{{publishDate}}",
  "author": { "@type": "Person", "name": "{{author.name}}" },
  "image": "{{heroImage}}"
}
```

Don't hand-write schema.org blocks in MDX — the layout handles them.

## Canonical URLs

The base layout sets `<link rel="canonical">` from the current URL. If a
doc is republished from elsewhere (rare), set `canonical` in frontmatter:

```yaml
canonical: https://engineering.example.com/original-post-url
```

## Images

- Every image has descriptive alt text. Screen readers use it; search crawlers use it.
- Prefer WebP for photos (smaller files, faster LCP)
- Hero images sized for the content area (max 1200px wide for docs, 1600px for blog)

## Page weight

- Lighthouse Performance threshold: ≥ 95. Drops below block deploy.
- Largest Contentful Paint target: ≤ 1.5s
- Keep client-side JS under 50KB gzipped per route (Astro's default is generous, Beacon is stricter)

## Don't

- Don't use "comprehensive guide to X" phrasings — SEO signal is weak, readers bounce
- Don't A/B test titles for search-ranked pages without a redirect plan
- Don't set `noindex` on docs — if a doc is not ready, mark `draft: true` instead
- Don't copy a competitor's docs outline. Write for what Beacon users actually hit.
