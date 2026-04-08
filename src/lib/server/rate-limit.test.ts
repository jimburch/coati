import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock rate-limiter-flexible before importing the module under test
const mockAnonConsume = vi.fn();
const mockAuthConsume = vi.fn();

vi.mock('rate-limiter-flexible', () => {
	class RateLimiterMemory {
		private points: number;
		constructor(opts: { points: number; duration: number }) {
			this.points = opts.points;
		}
		consume(key: string) {
			if (this.points === 100) {
				return mockAnonConsume(key);
			}
			return mockAuthConsume(key);
		}
	}
	return { RateLimiterMemory };
});

import { checkRateLimit } from './rate-limit';

function makeEvent(
	opts: {
		ip?: string;
		user?: { id: string; username: string } | null;
		pathname?: string;
	} = {}
) {
	return {
		getClientAddress: vi.fn().mockReturnValue(opts.ip ?? '127.0.0.1'),
		locals: {
			user: opts.user ?? null
		},
		url: {
			pathname: opts.pathname ?? '/'
		}
	};
}

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('allows anonymous request under limit', async () => {
		mockAnonConsume.mockResolvedValue({});
		const event = makeEvent();

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(mockAnonConsume).toHaveBeenCalledWith('127.0.0.1');
	});

	it('rejects anonymous request after exceeding 100 requests', async () => {
		const rateLimiterRes = { msBeforeNextReset: 45000 };
		mockAnonConsume.mockRejectedValue(rateLimiterRes);
		const event = makeEvent();

		const result = await checkRateLimit(event as never);

		expect(result.limited).toBe(true);
		expect(result.retryAfter).toBe(45);
	});

	it('allows authenticated request under higher limit', async () => {
		mockAuthConsume.mockResolvedValue({});
		const event = makeEvent({ user: { id: 'u1', username: 'alice' } });

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(mockAuthConsume).toHaveBeenCalledWith('127.0.0.1');
	});

	it('rejects authenticated request after exceeding 200 requests', async () => {
		const rateLimiterRes = { msBeforeNextReset: 30000 };
		mockAuthConsume.mockRejectedValue(rateLimiterRes);
		const event = makeEvent({ user: { id: 'u1', username: 'alice' } });

		const result = await checkRateLimit(event as never);

		expect(result.limited).toBe(true);
		expect(result.retryAfter).toBe(30);
	});

	it('skips rate limiting for /_app/ static paths', async () => {
		const event = makeEvent({ pathname: '/_app/immutable/entry/start.js' });

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(mockAnonConsume).not.toHaveBeenCalled();
		expect(mockAuthConsume).not.toHaveBeenCalled();
	});

	it('skips rate limiting for /favicon paths', async () => {
		const event = makeEvent({ pathname: '/favicon.ico' });

		const result = await checkRateLimit(event as never);

		expect(result).toEqual({ limited: false, retryAfter: 0 });
		expect(mockAnonConsume).not.toHaveBeenCalled();
		expect(mockAuthConsume).not.toHaveBeenCalled();
	});

	it('returns correct retryAfter rounded up to seconds', async () => {
		const rateLimiterRes = { msBeforeNextReset: 59999 };
		mockAnonConsume.mockRejectedValue(rateLimiterRes);
		const event = makeEvent();

		const result = await checkRateLimit(event as never);

		expect(result.limited).toBe(true);
		expect(result.retryAfter).toBe(60);
	});

	it('uses anonymous limiter when user is null', async () => {
		mockAnonConsume.mockResolvedValue({});
		const event = makeEvent({ user: null });

		await checkRateLimit(event as never);

		expect(mockAnonConsume).toHaveBeenCalled();
		expect(mockAuthConsume).not.toHaveBeenCalled();
	});

	it('uses authenticated limiter when user is present', async () => {
		mockAuthConsume.mockResolvedValue({});
		const event = makeEvent({ user: { id: 'u2', username: 'bob' } });

		await checkRateLimit(event as never);

		expect(mockAuthConsume).toHaveBeenCalled();
		expect(mockAnonConsume).not.toHaveBeenCalled();
	});
});
