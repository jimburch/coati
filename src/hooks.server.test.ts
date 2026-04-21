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

// Mock observability/sentry — use vi.fn() directly in factory to avoid TDZ issues
// with the module-level initSentry() call in hooks.server.ts
vi.mock('$lib/server/observability/sentry', () => ({
	initSentry: vi.fn(),
	setSentryUser: vi.fn()
}));

// Mock @sentry/sveltekit for setContext and captureException
vi.mock('@sentry/sveltekit', () => ({
	setContext: vi.fn(),
	captureException: vi.fn()
}));

import { handle, handleError, betaGate, getThemeFromCookie } from './hooks.server';
import { setSentryUser } from '$lib/server/observability/sentry';
import * as SentrySdk from '@sentry/sveltekit';

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

describe('hooks.server handle — authentication', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicBetaMode = '';
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
	});

	const user = { id: 'u1', username: 'test' };
	const session = { id: 'sess-1', expiresAt: new Date() };

	it('no token → nulls locals and skips validateSessionToken', async () => {
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

	it('cookie auth: validates, populates locals, refreshes cookie — and takes precedence over Bearer', async () => {
		// Cookie-only
		const cookieOnly = makeEvent();
		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });
		await handle({ event: cookieOnly.event, resolve: makeResolve() } as never);
		expect(mockValidateSessionToken).toHaveBeenCalledWith('cookie-token');
		expect(cookieOnly.event.locals.user).toBe(user);
		expect(cookieOnly.event.locals.session).toBe(session);
		expect(mockSetSessionCookie).toHaveBeenCalledWith(cookieOnly.event.cookies, 'cookie-token');

		// Cookie wins over Bearer when both are present
		vi.clearAllMocks();
		const both = makeEvent({ bearerToken: 'cli-token' });
		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });
		await handle({ event: both.event, resolve: makeResolve() } as never);
		expect(mockValidateSessionToken).toHaveBeenCalledWith('cookie-token');
	});

	it('bearer auth (no cookie): validates and populates locals but does NOT set a cookie', async () => {
		const { event } = makeEvent({ bearerToken: 'cli-token' });
		mockGetSessionToken.mockReturnValue(undefined);
		mockValidateSessionToken.mockResolvedValue({ user, session });

		await handle({ event, resolve: makeResolve() } as never);

		expect(mockValidateSessionToken).toHaveBeenCalledWith('cli-token');
		expect(event.locals.user).toBe(user);
		expect(event.locals.session).toBe(session);
		expect(mockSetSessionCookie).not.toHaveBeenCalled();
	});

	it('invalid tokens: clear cookie on bad cookie token, do NOT clear on bad Bearer', async () => {
		// Bad cookie → clears cookie
		const bad = makeEvent();
		mockGetSessionToken.mockReturnValue('bad-cookie-token');
		mockValidateSessionToken.mockResolvedValue(null);
		await handle({ event: bad.event, resolve: makeResolve() } as never);
		expect(mockDeleteSessionCookie).toHaveBeenCalledWith(bad.event.cookies);
		expect(bad.event.locals.user).toBeNull();
		expect(bad.event.locals.session).toBeNull();

		// Bad Bearer → leaves cookie alone
		vi.clearAllMocks();
		const badBearer = makeEvent({ bearerToken: 'bad-cli-token' });
		mockGetSessionToken.mockReturnValue(undefined);
		mockValidateSessionToken.mockResolvedValue(null);
		await handle({ event: badBearer.event, resolve: makeResolve() } as never);
		expect(mockDeleteSessionCookie).not.toHaveBeenCalled();
		expect(badBearer.event.locals.user).toBeNull();
		expect(badBearer.event.locals.session).toBeNull();
	});
});

describe('hooks.server handle — rate limiting & beta gate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicBetaMode = '';
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
	});

	it('limited: returns 429 with JSON body, Retry-After header, and never calls resolve', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();
		mockGetSessionToken.mockReturnValue(undefined);
		mockCheckRateLimit.mockResolvedValue({ limited: true, retryAfter: 42 });

		const response = await handle({ event, resolve } as never);

		expect(response.status).toBe(429);
		expect(response.headers.get('Retry-After')).toBe('42');
		expect(await response.json()).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED' });
		expect(resolve).not.toHaveBeenCalled();
	});

	it('not limited: resolves normally with status 200, and checkRateLimit runs after auth', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();
		const user = { id: 'u1', username: 'test' };
		const session = { id: 'sess-1', expiresAt: new Date() };
		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });

		const response = await handle({ event, resolve } as never);

		expect(response.status).toBe(200);
		expect(resolve).toHaveBeenCalledWith(
			event,
			expect.objectContaining({ transformPageChunk: expect.any(Function) })
		);
		// checkRateLimit sees the event after auth populated locals.user
		expect(mockCheckRateLimit).toHaveBeenCalledWith(event);
		expect(event.locals.user).toBe(user);
	});

	it('beta gate: allows unauthenticated user on a public route when beta mode is enabled', async () => {
		mockPublicBetaMode = 'true';
		const { event } = makeEvent();
		const resolve = makeResolve();
		mockGetSessionToken.mockReturnValue(undefined);
		(event as Record<string, unknown>).url = { pathname: '/explore' };

		const response = await handle({ event, resolve } as never);

		expect(response.status).toBe(200);
		expect(resolve).toHaveBeenCalledWith(
			event,
			expect.objectContaining({ transformPageChunk: expect.any(Function) })
		);
	});
});

describe('getThemeFromCookie', () => {
	it('maps the theme cookie value to a valid theme, defaulting to "dark"', () => {
		const expectTheme = (value: string | undefined, expected: string) => {
			expect(getThemeFromCookie({ get: vi.fn().mockReturnValue(value) } as never)).toBe(expected);
		};
		expectTheme(undefined, 'dark');
		expectTheme('dark', 'dark');
		expectTheme('light', 'light');
		expectTheme('system', 'system');
		expectTheme('invalid', 'dark');
	});
});

describe('handle surface detection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicBetaMode = '';
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
		mockGetSessionToken.mockReturnValue(undefined);
	});

	it('sets surface/cliVersion from user-agent (web by default, cli with version parsed from @coati/cli)', async () => {
		// No UA → web
		const noUa = makeEvent();
		await handle({ event: noUa.event, resolve: makeResolve() } as never);
		expect(noUa.event.locals.surface).toBe('web');
		expect(noUa.event.locals.cliVersion).toBeNull();

		// Browser UA → web
		const browser = makeEvent({
			userAgent:
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
		});
		await handle({ event: browser.event, resolve: makeResolve() } as never);
		expect(browser.event.locals.surface).toBe('web');
		expect(browser.event.locals.cliVersion).toBeNull();

		// CLI UA → cli + version
		const cli = makeEvent({ userAgent: '@coati/cli/0.3.2' });
		await handle({ event: cli.event, resolve: makeResolve() } as never);
		expect(cli.event.locals.surface).toBe('cli');
		expect(cli.event.locals.cliVersion).toBe('0.3.2');
	});
});

describe('betaGate', () => {
	it('allows traffic when beta mode is off, for API routes always, and for unauthenticated users on public pages', () => {
		// Off: always null
		expect(betaGate(makeGateEvent('/explore', null), false)).toBeNull();
		// API routes pass even when beta mode is on
		expect(betaGate(makeGateEvent('/api/v1/setups', null), true)).toBeNull();
		// Unauthenticated on any non-API route
		for (const path of [
			'/explore',
			'/',
			'/auth/login/github',
			'/waitlist',
			'/someuser/some-setup'
		]) {
			expect(betaGate(makeGateEvent(path, null), true)).toBeNull();
		}
	});

	it('redirects non-approved users to /waitlist on gated app routes, passes them on public routes', () => {
		for (const path of ['/new', '/settings', '/feed', '/admin', '/admin/beta']) {
			const response = betaGate(
				makeGateEvent(path, { isBetaApproved: false, isAdmin: false }),
				true
			);
			expect(response, `expected redirect for ${path}`).not.toBeNull();
			expect(response?.status).toBe(302);
			expect(response?.headers.get('Location')).toBe('/waitlist');
		}

		for (const path of ['/explore', '/', '/waitlist', '/someuser', '/someuser/some-setup']) {
			expect(
				betaGate(makeGateEvent(path, { isBetaApproved: false, isAdmin: false }), true)
			).toBeNull();
		}
	});

	it('allows approved users and admins (regardless of isBetaApproved) through gated routes', () => {
		for (const path of ['/new', '/settings']) {
			expect(
				betaGate(makeGateEvent(path, { isBetaApproved: true, isAdmin: false }), true)
			).toBeNull();
		}
		for (const path of ['/new', '/admin']) {
			expect(
				betaGate(makeGateEvent(path, { isBetaApproved: false, isAdmin: true }), true)
			).toBeNull();
		}
	});
});

describe('handle Sentry integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublicBetaMode = '';
		mockCheckRateLimit.mockResolvedValue({ limited: false, retryAfter: 0 });
		mockGetSessionToken.mockReturnValue(undefined);
	});

	it('tags Sentry context on every request, and only calls setSentryUser when authenticated', async () => {
		// Authenticated: setSentryUser is called
		const authed = makeEvent();
		const user = { id: 'u1', username: 'alice' };
		const session = { id: 'sess-1', expiresAt: new Date() };
		mockGetSessionToken.mockReturnValue('cookie-token');
		mockValidateSessionToken.mockResolvedValue({ user, session });
		await handle({ event: authed.event, resolve: makeResolve() } as never);
		expect(vi.mocked(setSentryUser)).toHaveBeenCalledWith({ id: 'u1', username: 'alice' });

		// Anonymous CLI request: no setSentryUser, but request_meta context is tagged
		vi.clearAllMocks();
		mockGetSessionToken.mockReturnValue(undefined);
		const anon = makeEvent({ userAgent: '@coati/cli/1.2.3' });
		await handle({ event: anon.event, resolve: makeResolve() } as never);
		expect(vi.mocked(setSentryUser)).not.toHaveBeenCalled();
		expect(vi.mocked(SentrySdk.setContext)).toHaveBeenCalledWith('request_meta', {
			surface: 'cli',
			cli_version: '1.2.3'
		});
	});
});

describe('handleError', () => {
	function makeErrorEvent(
		opts: {
			href?: string;
			method?: string;
			params?: Record<string, string>;
			headers?: Record<string, string>;
		} = {}
	) {
		const headers = new Headers(opts.headers ?? {});
		return {
			url: { href: opts.href ?? 'http://localhost/some/path' },
			request: {
				method: opts.method ?? 'GET',
				headers
			},
			params: opts.params ?? {}
		};
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('captures to Sentry with URL/method/routeParams, strips Authorization/Cookie, and returns a safe message', () => {
		const error = new Error('unauthorized');
		const event = makeErrorEvent({
			href: 'http://localhost/api/v1/setups/123',
			method: 'POST',
			params: { id: '123' },
			headers: {
				Authorization: 'Bearer secret-token',
				Cookie: 'session=abc123',
				'content-type': 'application/json',
				accept: 'text/html'
			}
		});

		const result = handleError({
			error,
			event,
			status: 500,
			message: 'unauthorized'
		} as never);

		// Safe message back to the client (no error leak)
		expect(result).toEqual({ message: 'An unexpected error occurred' });

		// Sentry called with the original error + extra context
		expect(vi.mocked(SentrySdk.captureException)).toHaveBeenCalledWith(
			error,
			expect.objectContaining({
				extra: expect.objectContaining({
					url: 'http://localhost/api/v1/setups/123',
					method: 'POST',
					routeParams: { id: '123' }
				})
			})
		);

		// Sensitive headers are stripped, innocuous headers preserved
		const call = vi.mocked(SentrySdk.captureException).mock.calls[0];
		const extra = (call[1] as { extra: Record<string, unknown> }).extra;
		const headers = extra.headers as Record<string, string>;
		expect(headers).not.toHaveProperty('authorization');
		expect(headers).not.toHaveProperty('Authorization');
		expect(headers).not.toHaveProperty('cookie');
		expect(headers).not.toHaveProperty('Cookie');
		expect(headers['content-type']).toBe('application/json');
		expect(headers['accept']).toBe('text/html');
	});

	it('does not capture 404s to Sentry (bot scans for .env etc. are noise, not bugs)', () => {
		const error = new Error('Not found: /api/v1/.env');
		const event = makeErrorEvent({
			href: 'https://coati.sh/api/v1/.env',
			method: 'GET'
		});

		const result = handleError({
			error,
			event,
			status: 404,
			message: 'Not Found'
		} as never);

		expect(result).toEqual({ message: 'An unexpected error occurred' });
		expect(vi.mocked(SentrySdk.captureException)).not.toHaveBeenCalled();
	});

	it('does not capture other 4xx errors to Sentry', () => {
		const error = new Error('Bad Request');
		const event = makeErrorEvent();

		handleError({ error, event, status: 400, message: 'Bad Request' } as never);

		expect(vi.mocked(SentrySdk.captureException)).not.toHaveBeenCalled();
	});
});
