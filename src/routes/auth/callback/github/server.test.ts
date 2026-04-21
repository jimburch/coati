import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/auth', () => ({
	github: {
		validateAuthorizationCode: vi.fn(async () => ({ accessToken: () => 'token-xyz' }))
	},
	upsertGithubUser: vi.fn(async () => 'user-1'),
	generateSessionToken: () => 'session-token',
	createSession: vi.fn(async () => {}),
	setSessionCookie: vi.fn()
}));

vi.mock('$lib/server/queries/users', () => ({
	updateLastLoginAt: vi.fn(async () => {})
}));

vi.mock('$lib/server/responses', () => ({
	error: (message: string, code: string, status: number) =>
		new Response(JSON.stringify({ error: message, code }), { status })
}));

import { GET } from './+server';

interface RedirectLike {
	status: number;
	location: string;
}

function makeEvent(oauthRedirectCookie: string | null): RequestEvent {
	const cookieStore = new Map<string, string>();
	cookieStore.set('github_oauth_state', 'valid-state');
	if (oauthRedirectCookie !== null) {
		cookieStore.set('oauth_redirect', oauthRedirectCookie);
	}
	const url = new URL('http://localhost/auth/callback/github?code=abc&state=valid-state');
	return {
		url,
		cookies: {
			get: (name: string) => cookieStore.get(name),
			delete: (name: string) => cookieStore.delete(name),
			set: vi.fn(),
			getAll: () => [],
			serialize: vi.fn()
		}
	} as unknown as RequestEvent;
}

async function capture(event: RequestEvent): Promise<RedirectLike | Response> {
	try {
		return (await (GET as unknown as (e: RequestEvent) => Promise<Response>)(event)) as Response;
	} catch (thrown: unknown) {
		return thrown as RedirectLike;
	}
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /auth/callback/github — redirect target validation', () => {
	it('falls back to / when oauth_redirect cookie is //evil.com', async () => {
		const result = await capture(makeEvent('//evil.com'));
		expect((result as RedirectLike).location).toBe('/');
	});

	it('falls back to / when oauth_redirect cookie is /\\evil.com', async () => {
		const result = await capture(makeEvent('/\\evil.com'));
		expect((result as RedirectLike).location).toBe('/');
	});

	it('falls back to / when oauth_redirect cookie is http://evil.com', async () => {
		const result = await capture(makeEvent('http://evil.com'));
		expect((result as RedirectLike).location).toBe('/');
	});

	it('honors a valid internal redirect cookie', async () => {
		const result = await capture(makeEvent('/explore'));
		expect((result as RedirectLike).location).toBe('/explore');
	});

	it('redirects to / when no oauth_redirect cookie is present', async () => {
		const result = await capture(makeEvent(null));
		expect((result as RedirectLike).location).toBe('/');
	});
});
