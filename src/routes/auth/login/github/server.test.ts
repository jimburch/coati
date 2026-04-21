import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$app/environment', () => ({ dev: true }));

vi.mock('$lib/server/auth', () => ({
	github: {
		createAuthorizationURL: vi.fn(() => new URL('https://github.com/login/oauth/authorize'))
	}
}));

vi.mock('arctic', () => ({ generateState: () => 'test-state' }));

import { GET } from './+server';

type CookieSetCall = [string, string, Record<string, unknown>];

function makeEvent(redirectParam: string | null): {
	event: RequestEvent;
	setCalls: CookieSetCall[];
} {
	const setCalls: CookieSetCall[] = [];
	const params = new URLSearchParams();
	if (redirectParam !== null) params.set('redirect', redirectParam);
	const url = new URL(`http://localhost/auth/login/github?${params.toString()}`);
	const event = {
		url,
		cookies: {
			set: (name: string, value: string, opts: Record<string, unknown>) => {
				setCalls.push([name, value, opts]);
			},
			get: () => undefined,
			delete: vi.fn(),
			getAll: () => [],
			serialize: vi.fn()
		}
	} as unknown as RequestEvent;
	return { event, setCalls };
}

async function runHandler(event: RequestEvent): Promise<Response | undefined> {
	try {
		return await (GET as unknown as (e: RequestEvent) => Promise<Response>)(event);
	} catch (thrown: unknown) {
		// SvelteKit `redirect(...)` throws a redirect-shaped object
		return thrown as Response;
	}
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /auth/login/github — oauth_redirect cookie', () => {
	it('does not set oauth_redirect when ?redirect=//evil.com (protocol-relative)', async () => {
		const { event, setCalls } = makeEvent('//evil.com/path');
		await runHandler(event);
		expect(setCalls.find(([name]) => name === 'oauth_redirect')).toBeUndefined();
	});

	it('does not set oauth_redirect when ?redirect=/\\evil.com (backslash escape)', async () => {
		const { event, setCalls } = makeEvent('/\\evil.com');
		await runHandler(event);
		expect(setCalls.find(([name]) => name === 'oauth_redirect')).toBeUndefined();
	});

	it('does not set oauth_redirect when ?redirect=http://evil.com (absolute URL)', async () => {
		const { event, setCalls } = makeEvent('http://evil.com');
		await runHandler(event);
		expect(setCalls.find(([name]) => name === 'oauth_redirect')).toBeUndefined();
	});

	it('does not set oauth_redirect when ?redirect is absent', async () => {
		const { event, setCalls } = makeEvent(null);
		await runHandler(event);
		expect(setCalls.find(([name]) => name === 'oauth_redirect')).toBeUndefined();
	});

	it('sets oauth_redirect when ?redirect=/explore (valid internal path)', async () => {
		const { event, setCalls } = makeEvent('/explore');
		await runHandler(event);
		const call = setCalls.find(([name]) => name === 'oauth_redirect');
		expect(call?.[1]).toBe('/explore');
	});
});
