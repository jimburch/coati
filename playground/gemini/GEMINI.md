# GEMINI.md — Beacon Docs

## Project Overview

Beacon Docs is the public documentation and blog site for the Beacon SaaS
product. It is built with Astro 5 using content collections, MDX for rich
documentation, and a small amount of interactive islands (a search box and a
"copy code" button).

The site deploys as static HTML + Cloudflare Pages. No server runtime.

## Tech Stack

- **Framework:** Astro 5 (static output)
- **Language:** TypeScript 5.6+ (strict)
- **Content:** MDX + Astro Content Collections (content layer API)
- **Styling:** Tailwind CSS 3 + `@tailwindcss/typography`
- **Syntax highlighting:** Shiki (built into Astro)
- **Search:** Pagefind (generated at build time)
- **Diagrams:** Mermaid rendered at build time via `remark-mermaid`
- **Islands:** Preact for the handful of interactive pieces
- **Deploy:** Cloudflare Pages (build on push to `main`)

## Project Structure

```
src/
├── content/
│   ├── config.ts                 # Collection schemas (Zod)
│   ├── docs/
│   │   ├── getting-started.mdx
│   │   ├── api/
│   │   │   └── authentication.mdx
│   │   └── guides/
│   └── blog/
│       └── 2026-01-launch.mdx
├── components/
│   ├── DocLayout.astro
│   ├── CodeBlock.astro            # Wraps Shiki with a copy button (Preact island)
│   ├── Callout.astro              # {type: 'info' | 'warning' | 'danger'}
│   └── search/
│       └── SearchBox.tsx          # Preact island using Pagefind
├── layouts/
│   ├── Base.astro
│   ├── Docs.astro
│   └── Blog.astro
├── pages/
│   ├── index.astro
│   ├── docs/
│   │   └── [...slug].astro        # Dynamic route for every doc
│   └── blog/
│       └── [...slug].astro
└── styles/
    └── global.css
```

## Coding Conventions

- Astro components (`.astro`): frontmatter uses TypeScript; prefer explicit types
- MDX: frontmatter validated by the collection schema — every file gets title, description, publishDate, author (for blog), category (for docs)
- Use named exports in `.ts` utility files; `.astro` files have no exports
- No default exports outside of Astro/MDX files
- Use `const` by default; never `var`
- Keep components small — Astro components under 150 lines, Preact islands under 100

## Content rules

- Every doc has a `title` (H1, set in frontmatter, not in-body) and a `description` (used for `<meta>` and search snippets)
- Use H2 (`##`) for top-level sections; never skip heading levels
- Code blocks must set a language: ` ```ts`, ` ```bash`, ` ```astro` — otherwise Shiki renders plaintext
- Use `:::` containers for Callouts: `<Callout type="warning">` via MDX components
- Internal links use relative paths: `[setup](./setup)` — never absolute URLs to our own domain
- External links open in a new tab via `<a href target="_blank" rel="noopener">`

## Content collections

`src/content/config.ts` defines schemas:

```ts
import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    category: z.enum(['getting-started', 'guides', 'api', 'reference']),
    order: z.number().default(0),
    draft: z.boolean().default(false)
  })
});

export const collections = { docs, blog };
```

## Build + deploy

- `pnpm build` generates static HTML to `dist/`
- `pnpm build` runs Pagefind after Astro's build (configured in `astro.config.ts`)
- Cloudflare Pages watches `main`; every merge triggers a deploy
- Draft content (`draft: true`) is excluded at build time

## Testing

- No unit tests — this is a content site
- Link checker via `pnpm check:links` (runs `lychee` against `dist/`)
- Lighthouse CI on every PR (configured in `.github/workflows/lighthouse.yml`)
- Visual regression via Playwright against the staging preview URL

## Do

- Run `pnpm astro check` to validate content frontmatter before committing
- Optimize images with `<Image>` from `astro:assets` — never `<img>` for content imagery
- Add an entry to `src/content/docs/<category>/_meta.json` when creating a new doc (drives sidebar order)
- Use Shiki's `{1,3-5}` line highlighting for code walkthroughs

## Don't

- Don't write new pages as static HTML in `src/pages/` — use a content collection
- Don't import React; use Preact for islands (already aliased in `astro.config.ts`)
- Don't use client-side routing — Astro is static HTML + View Transitions
- Don't commit raw PNGs/JPGs > 500KB; optimize first with `squoosh` or `sharp`
- Don't use inline `<script>` in MDX — add a Preact island instead
