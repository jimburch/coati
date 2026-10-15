---
name: Custom Fastify Plugins
description: Teaches Codex how to author reusable Fastify plugins for cross-cutting concerns (auth, rate limiting, request logging) following Pipedream's conventions.
---

# Custom Fastify Plugins

Plugins in Pipedream encapsulate cross-cutting concerns. They live in
`src/plugins/`, one file per responsibility.

## Anatomy of a plugin

Always wrap with `fastify-plugin` so decorators are visible outside the
encapsulation scope.

```typescript
// src/plugins/ratelimit.ts
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export default fp<{ max: number; window: string }>(
	async (app, opts) => {
		await app.register(rateLimit, {
			max: opts.max,
			timeWindow: opts.window,
			keyGenerator: (req) => {
				// Prefer API key, fall back to IP.
				return req.headers.authorization?.replace(/^Bearer /, '') ?? req.ip;
			},
			errorResponseBuilder: (req, ctx) => ({
				error: {
					message: `Rate limit exceeded. Retry in ${ctx.after}.`,
					code: 'RATE_LIMITED',
					details: { retryAfter: ctx.after }
				}
			})
		});
	},
	{ name: 'ratelimit', fastify: '5.x' }
);
```

## Decorators

Decorate the app, request, or reply objects for shared state. Always set a
default in the decorator signature so TypeScript narrowing works.

```typescript
// src/plugins/auth.ts
import fp from 'fastify-plugin';

declare module 'fastify' {
	interface FastifyRequest {
		workspace: { id: string; role: 'member' | 'admin' } | null;
	}
	interface FastifyInstance {
		authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
	}
}

export default fp(async (app) => {
	app.decorateRequest('workspace', null);

	app.decorate('authenticate', async (req, reply) => {
		const token = req.headers.authorization?.replace(/^Bearer /, '');
		if (!token) return reply.code(401).send({ error: { message: 'Unauthorized', code: 'UNAUTH' } });

		const workspace = await validateApiKey(token);
		if (!workspace) return reply.code(401).send({ error: { message: 'Invalid token', code: 'UNAUTH' } });

		req.workspace = workspace;
	});
});
```

## Registration order in `src/server.ts`

1. `helmet` and `cors` (headers must be set before any response)
2. `swagger` (schema collection starts early)
3. `error-handler` (needs to be registered before any route that may throw)
4. `auth` (decorators available to routes)
5. `ratelimit` (per-route limits may register after)
6. All route plugins

## Hooks vs. preHandler

- `onRequest` hook: use for authentication (runs before body parsing)
- `preValidation` hook: use for header normalization
- `preHandler` hook: use for authorization and workspace checks
- `onSend` hook: use for response envelope mutation
- `onError` hook: use for structured error logging

## Testing a plugin

Plugins are easier to test in isolation than embedded in routes.

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import ratelimit from './ratelimit.js';

describe('ratelimit plugin', () => {
	it('rejects the 101st request in a window', async () => {
		const app = Fastify();
		await app.register(ratelimit, { max: 100, window: '1 minute' });
		app.get('/ping', async () => ({ ok: true }));

		for (let i = 0; i < 100; i++) {
			const res = await app.inject({ method: 'GET', url: '/ping' });
			expect(res.statusCode).toBe(200);
		}

		const res = await app.inject({ method: 'GET', url: '/ping' });
		expect(res.statusCode).toBe(429);
		expect(res.json().error.code).toBe('RATE_LIMITED');
	});
});
```

## Don't

- Don't register a plugin twice — Fastify will crash at startup with `FST_ERR_INSTANCE_ALREADY_LISTENING`
- Don't mutate `request.raw` — use decorators
- Don't forget `fp()` — without it, decorators are scoped to the plugin only
- Don't register plugins inside route handlers — they go in `src/server.ts`
