---
name: SvelteKit Routes
description: Teaches Claude how to write SvelteKit load functions, form actions, and JSON endpoints following Linkly's conventions.
---

# SvelteKit Routes

Use this skill when writing anything under `src/routes/`.

## Route file conventions

- `+page.svelte` — the rendered component
- `+page.server.ts` — server-only `load` + form actions (SSR groups)
- `+page.ts` — universal `load` (runs on both server and client — rare in Linkly)
- `+layout.server.ts` — auth guards, shared data loading
- `+server.ts` — JSON endpoints (`GET`/`POST`/`PATCH`/`DELETE`)

## Load functions

Always:
- Throw `error(404)` for missing resources — do not return `null`
- Throw `error(401)` / `redirect(302, '/login')` for unauthenticated access
- Return a plain object with typed properties — SvelteKit serializes it

```typescript
// src/routes/(app)/dashboard/links/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getLinkById } from '$lib/server/queries/links';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const link = await getLinkById(params.id, locals.user.workspaceId);
	if (!link) throw error(404, 'Link not found');

	return { link };
};
```

## Form actions

Form actions handle mutations for SPA-group routes. Prefer these over
`+server.ts` endpoints for anything driven by a form in the UI.

```typescript
// src/routes/(app)/dashboard/links/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { CreateLinkSchema } from '$lib/utils/validation';
import { createLink } from '$lib/server/queries/links';

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'UNAUTHORIZED' });

		const form = await request.formData();
		const parsed = CreateLinkSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten().fieldErrors });
		}

		const link = await createLink({ ...parsed.data, workspaceId: locals.user.workspaceId });
		return { link };
	}
};
```

## JSON endpoints

For the public `/api/v1/*` surface only. Use `json()` helper, never
`new Response(JSON.stringify(...))`.

```typescript
// src/routes/api/v1/links/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CreateLinkSchema } from '$lib/utils/validation';
import { createLink, listLinks } from '$lib/server/queries/links';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.apiKey) throw error(401, 'API key required');

	const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100);
	const links = await listLinks(locals.apiKey.workspaceId, { limit });
	return json({ data: links });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.apiKey) throw error(401, 'API key required');

	const body = await request.json();
	const parsed = CreateLinkSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, JSON.stringify({ error: 'Validation failed', code: 'VALIDATION_ERROR' }));
	}

	const link = await createLink({ ...parsed.data, workspaceId: locals.apiKey.workspaceId });
	return json({ data: link }, { status: 201 });
};
```

## Layout groups

- `(marketing)/+layout.ts` sets `export const ssr = true` and `export const prerender = true` where possible
- `(app)/+layout.ts` sets `export const ssr = false`
- `(app)/+layout.server.ts` performs the auth redirect — all children inherit

## Don't

- Don't call `fetch` to our own app from a `load` function — import the query directly
- Don't use `$app/stores` (deprecated in Svelte 5) — use `$app/state`
- Don't mix form actions and `+server.ts` for the same operation
- Don't forget the `./$types` imports; typed `params`, `locals`, and return values all come from there
