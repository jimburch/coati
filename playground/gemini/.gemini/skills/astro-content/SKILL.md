---
name: Astro Content Collections
description: Teaches Gemini how Beacon uses Astro content collections — schema definitions, getCollection, slug routing, and draft handling.
---

# Astro Content Collections

Beacon Docs uses content collections for every page under `/docs` and `/blog`.
There is no static HTML page outside the marketing root.

## Collection definition

Every collection has a Zod schema. Adding a new collection:

1. Create `src/content/<name>/` with at least one `.mdx` file.
2. Add a `defineCollection(...)` entry in `src/content/config.ts`.
3. Register it in the exported `collections` object.
4. Add a dynamic route under `src/pages/<name>/[...slug].astro`.

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    category: z.enum(['getting-started', 'guides', 'api', 'reference']),
    order: z.number().default(0),
    draft: z.boolean().default(false),
    updatedAt: z.coerce.date().optional()
  })
});

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string().max(160),
    author: z.string(),
    publishDate: z.coerce.date(),
    tags: z.array(z.string()).min(1).max(5),
    heroImage: image().optional(),
    draft: z.boolean().default(false)
  })
});

export const collections = { docs, blog };
```

## Dynamic routes

```astro
---
// src/pages/docs/[...slug].astro
import { getCollection, getEntry } from 'astro:content';
import Docs from '~/layouts/Docs.astro';

export async function getStaticPaths() {
  const docs = await getCollection('docs', ({ data }) => !data.draft);
  return docs.map((doc) => ({
    params: { slug: doc.slug },
    props: { doc }
  }));
}

const { doc } = Astro.props;
const { Content, headings } = await doc.render();
---

<Docs frontmatter={doc.data} headings={headings}>
  <Content />
</Docs>
```

## Draft handling

Drafts are filtered out at build time. The filter lives in every
`getStaticPaths` — do not rely on a global config flag.

```ts
const docs = await getCollection('docs', ({ data }) => !data.draft);
```

This keeps drafts out of: dynamic routes, sitemap, RSS feed, search index.

## The `_meta.json` sidebar order

Beacon's sidebar reads per-category ordering from `_meta.json`:

```json
// src/content/docs/guides/_meta.json
["getting-started", "webhooks", "api-keys", "billing"]
```

When adding a new doc, update `_meta.json` in the same commit. Forgetting
this is the #1 reason a new page shows up at the bottom of the sidebar.

## `headings` for in-page TOC

`doc.render()` returns `headings: MarkdownHeading[]`. Use it to render the
right-rail table of contents. Never parse headings yourself.

## Related content

Linking between pages:

```astro
---
import { getEntry } from 'astro:content';
const related = await getEntry('docs', 'api/authentication');
---
<a href={`/docs/${related.slug}`}>{related.data.title}</a>
```

Prefer `getEntry` over hard-coded URLs — the slug can change, but the id
reference stays stable.

## Don't

- Don't use `type: 'data'` collections for Markdown content — use `type: 'content'` (the default)
- Don't call `getCollection` in a component — pass the collection from the route via props
- Don't skip the Zod schema — future-you will thank present-you for the validation
- Don't use `Astro.glob()` for content — it bypasses the collection pipeline
