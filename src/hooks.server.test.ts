import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { handle } from './hooks.server';

function makeEvent(opts: { cookie?: string; bearerToken?: string } = {}) {
	const locals: Record<string, unknown> = {};
	const cookies = {
		get: vi.fn(),
		set: vi.fn()
	};
	const headers = new Headers();
	if (opts.bearerToken) {
		headers.set('Authorization', `Bearer ${opts.bearerToken}`);
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

describe('hooks.server handle', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sets user and session to null when no token present', async () => {
		const { event } = makeEvent();
		const resolve = makeResolve();
		mockGetSessionToken.mockReturnValue(undefined);

		await handle({ event, resolve } as never);

		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
		expect(mockValidateSessionToken).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalledWith(event);
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
});
