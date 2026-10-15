---
name: Vitest Testing Patterns
description: Teaches Codex how to write unit and integration tests for Pipedream using Vitest and supertest against a real Postgres database.
---

# Vitest Testing Patterns

Pipedream uses Vitest for both unit and integration tests. Tests colocate with
the code they test.

## Layout

```
src/
├── lib/
│   ├── hmac.ts
│   ├── hmac.test.ts          # unit test (pure function, no DB)
│   └── …
├── db/queries/
│   ├── jobs.ts
│   └── jobs.test.ts          # integration test (real DB)
└── __tests__/
    └── integration/
        └── webhooks.test.ts  # full HTTP integration
```

## Unit tests

For pure functions and modules with no side effects. Mock external
dependencies with `vi.mock()` at module boundary.

```typescript
// src/lib/hmac.test.ts
import { describe, expect, it } from 'vitest';
import { verifyHmacSignature } from './hmac.js';

describe('verifyHmacSignature', () => {
	const secret = 'whsec_test_abc';

	it('accepts a valid signature', () => {
		const body = '{"event":"test"}';
		const sig = 'sha256=abc…'; // precomputed
		expect(verifyHmacSignature(body, sig, secret)).toBe(true);
	});

	it('rejects a tampered body', () => {
		const body = '{"event":"test","evil":true}';
		const sig = 'sha256=abc…';
		expect(verifyHmacSignature(body, sig, secret)).toBe(false);
	});

	it('rejects a signature with the wrong algorithm', () => {
		const body = '{"event":"test"}';
		const sig = 'md5=abc…';
		expect(verifyHmacSignature(body, sig, secret)).toBe(false);
	});

	it('uses constant-time comparison', () => {
		// Ensures an attacker cannot time-side-channel the comparison.
		// If the implementation switches to `===`, this test still passes, so
		// we rely on code review + the security-auditor subagent as well.
		const body = '{"event":"test"}';
		expect(() => verifyHmacSignature(body, 'sha256=', secret)).not.toThrow();
	});
});
```

## Integration tests — HTTP

Build the Fastify app via the factory; do not start a listener. Use
`app.inject()` rather than `supertest` — it's faster and typed.

```typescript
// src/__tests__/integration/webhooks.test.ts
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../server.js';
import { resetDatabase, seedWorkspace } from '../helpers/db.js';

const app = buildApp();
await app.ready();

afterAll(() => app.close());

describe('POST /webhooks/:id', () => {
	beforeEach(() => resetDatabase());

	it('accepts a valid HMAC-signed payload and returns 202', async () => {
		const workspace = await seedWorkspace({ secret: 'whsec_test' });
		const body = JSON.stringify({ event: 'order.created' });

		const res = await app.inject({
			method: 'POST',
			url: `/webhooks/${workspace.webhookId}`,
			headers: {
				'content-type': 'application/json',
				'x-signature': signHmac(body, 'whsec_test')
			},
			payload: body
		});

		expect(res.statusCode).toBe(202);
		expect(res.json().data.jobId).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('rejects an invalid signature with 401', async () => {
		const workspace = await seedWorkspace({ secret: 'whsec_test' });
		const res = await app.inject({
			method: 'POST',
			url: `/webhooks/${workspace.webhookId}`,
			headers: { 'x-signature': 'sha256=bogus' },
			payload: '{}'
		});
		expect(res.statusCode).toBe(401);
		expect(res.json().error.code).toBe('INVALID_SIGNATURE');
	});
});
```

## Integration tests — DB

For query-layer tests, use a dedicated test schema and truncate between tests.

```typescript
// src/db/queries/jobs.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { claimJob } from './jobs.js';
import { resetDatabase, seedJob } from '../../__tests__/helpers/db.js';

describe('claimJob', () => {
	beforeEach(() => resetDatabase());

	it('claims the oldest pending job and marks it running', async () => {
		await seedJob({ createdAt: new Date('2026-01-01') });
		const newer = await seedJob({ createdAt: new Date('2026-01-02') });

		const claimed = await claimJob('worker-1');
		expect(claimed?.id).not.toBe(newer.id);
		expect(claimed?.status).toBe('running');
		expect(claimed?.claimedBy).toBe('worker-1');
	});

	it('returns null when no pending jobs exist', async () => {
		const claimed = await claimJob('worker-1');
		expect(claimed).toBeNull();
	});

	it('does not double-claim under concurrent access', async () => {
		await seedJob({});
		const [a, b] = await Promise.all([claimJob('worker-1'), claimJob('worker-2')]);
		// Exactly one worker should claim; the other gets null thanks to SKIP LOCKED.
		expect([a, b].filter(Boolean)).toHaveLength(1);
	});
});
```

## Rules

- Every bug fix gets at least one regression test that fails on the old code
- Never mock Drizzle. Use a real test Postgres (`docker compose up -d db-test`)
- Never mock internal modules you own — refactor for seam injection instead
- Test names read as sentences: `"returns 404 when job not found"` not `"test1"`
- One assertion per behavior; multiple assertions in one test are fine only when they describe the same behavior

## Don't

- Don't test implementation details (private functions, internal state)
- Don't share mutable state between tests via module-level variables
- Don't use `beforeAll` for DB setup that other tests depend on — use `beforeEach`
- Don't assume test order; `it.concurrent` may run tests in parallel
