import { describe, it, expect, vi, beforeEach } from 'vitest';

let disableRateLimit = '';

vi.mock('$env/dynamic/private', () => ({
	env: {
		get DISABLE_RATE_LIMIT() {
			return disableRateLimit;
		}
	}
}));

import { checkRateLimit } from './rate-limit';

function makeEvent(
	opts: {
		ip?: string;
		user?: { id: string; username: string } | null;
		pathname?: string;
		anonSuccess?: boolean;
		authSuccess?: boolean;
		omitBinding?: 'anon' | 'auth';
	} = {}
) {
	const anonLimit = vi.fn().mockResolvedValue({ success: opts.anonSuccess ?? true });
	const authLimit = vi.fn().mockResolvedValue({ success: opts.authSuccess ?? true });
	return {
		event: {
			getClientAddress: vi.fn().mockReturnValue(opts.ip ?? '127.0.0.1'),
			locals: {
				user: opts.user ?? null
			},
			url: {
				pathname: opts.pathname ?? '/'
			},
			platform: {
				env: {
					RL_ANON: opts.omitBinding === 'anon' ? undefined : { limit: anonLimit },
					RL_AUTH: opts.omitBinding === 'auth' ? undefined : { limit: authLimit }
				}
			}
		},
		anonLimit,
		authLimit
	};
}

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		disableRateLimit = '';
	});

	it('allows anonymous request under limit and keys by IP', async () => {
		const { event, anonLimit } = makeEvent();

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(anonLimit).toHaveBeenCalledWith({ key: '127.0.0.1' });
	});

	it('rejects anonymous request with Retry-After 60', async () => {
		const { event } = makeEvent({ anonSuccess: false });

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: true, retryAfter: 60 });
	});

	it('allows authenticated request keyed by user id', async () => {
		const { event, authLimit, anonLimit } = makeEvent({
			user: { id: 'u1', username: 'alice' }
		});

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(authLimit).toHaveBeenCalledWith({ key: 'u1' });
		expect(anonLimit).not.toHaveBeenCalled();
	});

	it('rejects authenticated request after the auth binding denies it', async () => {
		const { event, authLimit } = makeEvent({
			user: { id: 'u1', username: 'alice' },
			authSuccess: false
		});

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: true, retryAfter: 60 });
		expect(authLimit).toHaveBeenCalledWith({ key: 'u1' });
	});

	it('skips rate limiting for /_app/ static paths', async () => {
		const { event, anonLimit, authLimit } = makeEvent({
			pathname: '/_app/immutable/entry/start.js'
		});

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(anonLimit).not.toHaveBeenCalled();
		expect(authLimit).not.toHaveBeenCalled();
	});

	it('skips rate limiting for /favicon paths', async () => {
		const { event, anonLimit, authLimit } = makeEvent({ pathname: '/favicon.ico' });

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(anonLimit).not.toHaveBeenCalled();
		expect(authLimit).not.toHaveBeenCalled();
	});

	it('uses anonymous limiter when user is null', async () => {
		const { event, anonLimit, authLimit } = makeEvent({ user: null });

		await checkRateLimit(event as never);

		expect(anonLimit).toHaveBeenCalled();
		expect(authLimit).not.toHaveBeenCalled();
	});

	it('uses authenticated limiter when user is present', async () => {
		const { event, anonLimit, authLimit } = makeEvent({ user: { id: 'u2', username: 'bob' } });

		await checkRateLimit(event as never);

		expect(authLimit).toHaveBeenCalled();
		expect(anonLimit).not.toHaveBeenCalled();
	});

	it('skips the binding when DISABLE_RATE_LIMIT is true', async () => {
		disableRateLimit = 'true';
		const { event, anonLimit } = makeEvent();

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(anonLimit).not.toHaveBeenCalled();
	});

	it('throws when the binding is missing', async () => {
		const { event } = makeEvent({ omitBinding: 'anon' });

		await expect(checkRateLimit(event as never)).rejects.toThrow(
			'Rate limit binding is not configured'
		);
	});
});
