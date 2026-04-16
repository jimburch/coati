import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock $env/dynamic/public (must be before other mocks and imports)
let mockPublicBetaMode = '';
vi.mock('$env/dynamic/public', () => ({
	env: {
		get PUBLIC_BETA_MODE() {
			return mockPublicBetaMode;
		},
		PUBLIC_SITE_URL: 'http://localhost:5173'
	}
}));

// Mock auth module
const mockValidateSessionToken = vi.fn();
const mockGetSessionToken = vi.fn();
const mockDeleteSessionCookie = vi.fn();
const mockSetSessionCookie = vi.fn();

vi.mock('$lib/server/auth', () => ({
	validateSessionToken: (...args: unknown[]) => mockValidateSessionToken(...args),
	getSessionToken: (...args: unknown[]) => mockGetSessionToken(...args),
	deleteSessionCookie: (...args: unknown[]) => mockDeleteSessionCookie(...args),
	setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args)
}));

// Mock rate-limit module
const mockCheckRateLimit = vi.fn();

vi.mock('$lib/server/rate-limit', () => ({
	checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args)
}));

import { handle, betaGate, getThemeFromCookie } from './hooks.server';

function makeEvent(opts: { cookie?: string; bearerToken?: string; userAgent?: string } = {}) {
	const locals: Record<string, unknown> = {};
	const cookies = {
		get: vi.fn().mockReturnValue(undefined),
		set: vi.fn()
	};
	const headers = new Headers();
	if (opts.bearerToken) {
		headers.set('Authorization', `Bearer ${opts.bearerToken}`);
	}
	if (opts.userAgent) {
		headers.set('User-Agent', opts.userAgent);
	}
	return {
		event: {
			locals,
			cookies,
			request: { headers }
		},
		cookie: opts.cookie
	};
}

function makeResolve() {
	return vi.fn().mockImplementation(() => new Response('ok'));
}

function makeGateEvent(
	pathname: string,
	user: { isBetaApproved: boolean; isAdmin: boolean } | null
) {
	return {
		locals: { user },
		url: { pathname }
	};
}

describe('hooks.server handle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicBetaMode = '';
		// Default: not rate limited
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
	});

	it('sets user and session to null when no token present', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();
		mockGetSessionToken.mockReturnValue(undefined);

		await handle({ event, resolve } as never);

		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
		expect(mockValidateSessionToken).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalledWith(
			event,
			expect.objectContaining({ transformPageChunk: expect.any(Function) })
		);
	});

	it('authenticates via cookie token', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();
		const user = { id: 'u1', username: 'test' };
		const session = { id: 'sess-1', expiresAt: new Date() };

		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });

		await handle({ event, resolve } as never);

		expect(mockValidateSessionToken).toHaveBeenCalledWith('cookie-token');
		expect(event.locals.user).toBe(user);
		expect(event.locals.session).toBe(session);
	});

	it('authenticates via Bearer token when no cookie', async () => {
		const { event } = makeEvent({ bearerToken: 'cli-token' });
		const resolve = makeResolve();
		const user = { id: 'u1', username: 'test' };
		const session = { id: 'sess-1', expiresAt: new Date() };

		mockGetSessionToken.mockReturnValue(undefined);
		mockValidateSessionToken.mockResolvedValue({ user, session });

		await handle({ event, resolve } as never);

		expect(mockValidateSessionToken).toHaveBeenCalledWith('cli-token');
		expect(event.locals.user).toBe(user);
		expect(event.locals.session).toBe(session);
	});

	it('cookie takes precedence over Bearer token', async () => {
		const { event } = makeEvent({ bearerToken: 'cli-token' });
		const resolve = makeResolve();
		const user = { id: 'u1', username: 'test' };
		const session = { id: 'sess-1', expiresAt: new Date() };

		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });

		await handle({ event, resolve } as never);

		expect(mockValidateSessionToken).toHaveBeenCalledWith('cookie-token');
	});

	it('clears cookie and nulls locals when cookie token is invalid', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();

		mockGetSessionToken.mockReturnValue('bad-cookie-token');
		mockValidateSessionToken.mockResolvedValue(null);

		await handle({ event, resolve } as never);

		expect(mockDeleteSessionCookie).toHaveBeenCalledWith(event.cookies);
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('does not clear cookie when Bearer token is invalid', async () => {
		const { event } = makeEvent({ bearerToken: 'bad-cli-token' });
		const resolve = makeResolve();

		mockGetSessionToken.mockReturnValue(undefined);
		mockValidateSessionToken.mockResolvedValue(null);

		await handle({ event, resolve } as never);

		expect(mockDeleteSessionCookie).not.toHaveBeenCalled();
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('refreshes cookie on valid cookie-based session', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();
		const user = { id: 'u1', username: 'test' };
		const session = { id: 'sess-1', expiresAt: new Date() };

		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });

		await handle({ event, resolve } as never);

		expect(mockSetSessionCookie).toHaveBeenCalledWith(event.cookies, 'cookie-token');
	});

	it('does not refresh cookie for Bearer-only auth', async () => {
		const { event } = makeEvent({ bearerToken: 'cli-token' });
		const resolve = makeResolve();
		const user = { id: 'u1', username: 'test' };
		const session = { id: 'sess-1', expiresAt: new Date() };

		mockGetSessionToken.mockReturnValue(undefined);
		mockValidateSessionToken.mockResolvedValue({ user, session });

		await handle({ event, resolve } as never);

		expect(mockSetSessionCookie).not.toHaveBeenCalled();
	});

	describe('rate limiting', () => {
		it('returns 429 when checkRateLimit reports limited: true', async () => {
			const { event } = makeEvent();
			const resolve = makeResolve();
			mockGetSessionToken.mockReturnValue(undefined);
			mockCheckRateLimit.mockResolvedValue({ limited: true, retryAfter: 30 });

			const response = await handle({ event, resolve } as never);

			expect(response.status).toBe(429);
			expect(resolve).not.toHaveBeenCalled();
			const body = await response.json();
			expect(body).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED' });
		});

		it('calls resolve normally when checkRateLimit reports limited: false', async () => {
			const { event } = makeEvent();
			const resolve = makeResolve();
			mockGetSessionToken.mockReturnValue(undefined);
			mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });

			const response = await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalledWith(
				event,
				expect.objectContaining({ transformPageChunk: expect.any(Function) })
			);
			expect(response.status).toBe(200);
		});

		it('sets Retry-After header to retryAfter value from checkRateLimit', async () => {
			const { event } = makeEvent();
			const resolve = makeResolve();
			mockGetSessionToken.mockReturnValue(undefined);
			mockCheckRateLimit.mockResolvedValue({ limited: true, retryAfter: 42 });

			const response = await handle({ event, resolve } as never);

			expect(response.headers.get('Retry-After')).toBe('42');
		});

		it('calls checkRateLimit after auth resolution', async () => {
			const { event } = makeEvent();
			const resolve = makeResolve();
			const user = { id: 'u1', username: 'test' };
			const session = { id: 'sess-1', expiresAt: new Date() };

			mockGetSessionToken.mockReturnValue('cookie-token');
			mockValidateSessionToken.mockResolvedValue({ user, session });
			mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });

			await handle({ event, resolve } as never);

			// checkRateLimit is called with event that already has locals.user set
			expect(mockCheckRateLimit).toHaveBeenCalledWith(event);
			expect(event.locals.user).toBe(user);
		});
	});

	describe('handle uses betaGate', () => {
		it('allows unauthenticated user on public route when beta mode enabled', async () => {
			mockPublicBetaMode = 'true';
			const { event } = makeEvent();
			const resolve = makeResolve();
			mockGetSessionToken.mockReturnValue(undefined);
			(event as Record<string, unknown>).url = { pathname: '/explore' };

			const response = await handle({ event, resolve } as never);

			expect(resolve).toHaveBeenCalledWith(
				event,
				expect.objectContaining({ transformPageChunk: expect.any(Function) })
			);
			expect(response.status).toBe(200);
		});
	});
});

describe('getThemeFromCookie', () => {
	it('returns "dark" when no theme cookie is set', () => {
		const cookies = { get: vi.fn().mockReturnValue(undefined) };
		expect(getThemeFromCookie(cookies as never)).toBe('dark');
	});

	it('returns "dark" when theme cookie is "dark"', () => {
		const cookies = { get: vi.fn().mockReturnValue('dark') };
		expect(getThemeFromCookie(cookies as never)).toBe('dark');
	});

	it('returns "light" when theme cookie is "light"', () => {
		const cookies = { get: vi.fn().mockReturnValue('light') };
		expect(getThemeFromCookie(cookies as never)).toBe('light');
	});

	it('returns "system" when theme cookie is "system"', () => {
		const cookies = { get: vi.fn().mockReturnValue('system') };
		expect(getThemeFromCookie(cookies as never)).toBe('system');
	});

	it('returns "dark" for invalid cookie values', () => {
		const cookies = { get: vi.fn().mockReturnValue('invalid') };
		expect(getThemeFromCookie(cookies as never)).toBe('dark');
	});
});

describe('handle surface detection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicBetaMode = '';
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
		mockGetSessionToken.mockReturnValue(undefined);
	});

	it('sets surface to "web" and cliVersion to null when no user-agent is present', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();

		await handle({ event, resolve } as never);

		expect(event.locals.surface).toBe('web');
		expect(event.locals.cliVersion).toBeNull();
	});

	it('sets surface to "web" and cliVersion to null for a browser user-agent', async () => {
		const { event } = makeEvent({
			userAgent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
		});
		const resolve = makeResolve();

		await handle({ event, resolve } as never);

		expect(event.locals.surface).toBe('web');
		expect(event.locals.cliVersion).toBeNull();
	});

	it('sets surface to "cli" and extracts cliVersion from @coati/cli user-agent', async () => {
		const { event } = makeEvent({ userAgent: '@coati/cli/0.3.2' });
		const resolve = makeResolve();

		await handle({ event, resolve } as never);

		expect(event.locals.surface).toBe('cli');
		expect(event.locals.cliVersion).toBe('0.3.2');
	});
});

describe('betaGate', () => {
	it('betaGate returns null when betaModeEnabled is false', () => {
		const event = makeGateEvent('/explore', null);
		expect(betaGate(event, false)).toBeNull();
	});

	it('betaGate returns null for API routes even when beta mode enabled', () => {
		const event = makeGateEvent('/api/v1/setups', null);
		expect(betaGate(event, true)).toBeNull();
	});

	it('betaGate allows unauthenticated user on any non-API route', () => {
		expect(betaGate(makeGateEvent('/explore', null), true)).toBeNull();
		expect(betaGate(makeGateEvent('/', null), true)).toBeNull();
		expect(betaGate(makeGateEvent('/auth/login/github', null), true)).toBeNull();
		expect(betaGate(makeGateEvent('/waitlist', null), true)).toBeNull();
		expect(betaGate(makeGateEvent('/someuser/some-setup', null), true)).toBeNull();
	});

	it('betaGate redirects non-approved user on gated (app) routes to waitlist', () => {
		for (const path of ['/new', '/settings', '/feed', '/admin', '/admin/beta']) {
			const response = betaGate(
				makeGateEvent(path, { isBetaApproved: false, isAdmin: false }),
				true
			);
			expect(response).not.toBeNull();
			expect(response?.status).toBe(302);
			expect(response?.headers.get('Location')).toBe('/waitlist');
		}
	});

	it('betaGate allows non-approved user on public routes', () => {
		for (const path of ['/explore', '/', '/waitlist', '/someuser', '/someuser/some-setup']) {
			expect(
				betaGate(makeGateEvent(path, { isBetaApproved: false, isAdmin: false }), true)
			).toBeNull();
		}
	});

	it('betaGate allows approved authenticated user on gated routes', () => {
		expect(
			betaGate(makeGateEvent('/new', { isBetaApproved: true, isAdmin: false }), true)
		).toBeNull();
		expect(
			betaGate(makeGateEvent('/settings', { isBetaApproved: true, isAdmin: false }), true)
		).toBeNull();
	});

	it('betaGate allows admin user through regardless of isBetaApproved', () => {
		expect(
			betaGate(makeGateEvent('/new', { isBetaApproved: false, isAdmin: true }), true)
		).toBeNull();
		expect(
			betaGate(makeGateEvent('/admin', { isBetaApproved: false, isAdmin: true }), true)
		).toBeNull();
	});
});
