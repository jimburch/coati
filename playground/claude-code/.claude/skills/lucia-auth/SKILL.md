---
name: Lucia Auth v3 Patterns
description: Teaches Claude how Linkly's authentication works — session validation, OAuth, API keys, and route guards.
---

# Lucia Auth v3 Patterns

Linkly uses Lucia v3 + Arctic for GitHub and Google OAuth. API access uses
opaque tokens issued per workspace.

## Session validation lives in `hooks.server.ts`

Every request resolves `locals.user` (for cookie sessions) or `locals.apiKey`
(for Bearer tokens). The two are mutually exclusive.

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth/lucia';
import { validateApiKey } from '$lib/server/auth/apiKey';

export const handle: Handle = async ({ event, resolve }) => {
	// Bearer token path (API clients)
	const auth = event.request.headers.get('authorization');
	if (auth?.startsWith('Bearer ')) {
		event.locals.apiKey = await validateApiKey(auth.slice(7));
		return resolve(event);
	}

	// Cookie path (browser)
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session?.fresh) {
		const cookie = lucia.createSessionCookie(session.id);
		event.cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
	}
	if (!session) {
		const blank = lucia.createBlankSessionCookie();
		event.cookies.set(blank.name, blank.value, { path: '.', ...blank.attributes });
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};
```

## Route guards

Use `(app)/+layout.server.ts` as the single guard for authenticated routes:

```typescript
// src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');
	return { user: locals.user };
};
```

**Still check `locals.user` in child loads.** Parent guards can be bypassed by
a typo in the route group. Defense-in-depth is cheap.

## OAuth flow

Providers live in `src/lib/server/auth/oauth.ts`. State and code verifier are
stored in cookies, never query params.

```typescript
// src/routes/auth/github/+server.ts
import { generateState } from 'arctic';
import { github } from '$lib/server/auth/oauth';

export const GET = async ({ cookies }) => {
	const state = generateState();
	const url = await github.createAuthorizationURL(state, ['user:email']);

	cookies.set('github_oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: import.meta.env.PROD,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	return new Response(null, { status: 302, headers: { location: url.toString() } });
};
```

## API keys

API keys are issued per workspace and stored hashed. The plaintext is shown
once at creation and never again.

```typescript
// src/lib/server/auth/apiKey.ts
import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { apiKeys } from '$lib/server/db/schema';

export function mintApiKey(): { plain: string; hash: string; prefix: string } {
	const raw = randomBytes(32).toString('base64url');
	const plain = `lk_live_${raw}`;
	const hash = createHash('sha256').update(plain).digest('hex');
	return { plain, hash, prefix: plain.slice(0, 12) };
}

export async function validateApiKey(token: string) {
	if (!token.startsWith('lk_live_')) return null;
	const hash = createHash('sha256').update(token).digest('hex');
	const [row] = await db.select().from(apiKeys).where(eq(apiKeys.hash, hash)).limit(1);
	if (!row || row.revokedAt) return null;
	return row;
}
```

## Rate limiting

Attach limiters to sensitive routes. Use `event.getClientAddress()` as the
identifier, not `X-Forwarded-For` directly (SvelteKit already parses it).

```typescript
// src/routes/auth/callback/+server.ts
import { authCallbackLimiter } from '$lib/server/ratelimit';

export const GET = async (event) => {
	const { success } = await authCallbackLimiter.limit(event.getClientAddress());
	if (!success) throw error(429, 'Too many requests');
	// … rest of callback
};
```

## Don't

- Don't read cookies directly in route handlers — trust `locals`
- Don't call `process.env.GITHUB_CLIENT_SECRET` — use `$env/static/private`
- Don't store API key plaintext anywhere after creation
- Don't skip the `same-origin` cookie check on OAuth callbacks
