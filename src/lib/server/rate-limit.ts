import { RateLimiterMemory } from 'rate-limiter-flexible';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * In-memory rate limiter — MVP implementation.
 *
 * Limitations:
 * - State is lost on every server restart; counters reset to zero.
 * - State is NOT shared across PM2 cluster workers. Each worker process
 *   maintains its own independent counters, so the effective rate limit
 *   per IP is (configured limit × number of workers). For example, with
 *   4 PM2 workers and `points: 100`, a single IP can make up to 400
 *   requests per minute before being throttled.
 *
 * Migration path for horizontal scaling:
 * Switch `RateLimiterMemory` to `RateLimiterPostgres` or `RateLimiterRedis`
 * from the same `rate-limiter-flexible` package. Both are drop-in
 * replacements with an identical API — only the constructor and its
 * connection options change. Shared state in PostgreSQL (already available)
 * or Redis eliminates the per-worker multiplication problem and survives
 * restarts.
 *
 * Example (PostgreSQL drop-in):
 *   import { RateLimiterPostgres } from 'rate-limiter-flexible';
 *   const anonLimiter = new RateLimiterPostgres({ storeClient: pgClient, points: 100, duration: 60 });
 *
 * Example (Redis drop-in):
 *   import { RateLimiterRedis } from 'rate-limiter-flexible';
 *   const anonLimiter = new RateLimiterRedis({ storeClient: redisClient, points: 100, duration: 60 });
 */
const anonLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
const authLimiter = new RateLimiterMemory({ points: 200, duration: 60 });

const STATIC_PREFIXES = ['/_app/', '/favicon'];

export async function checkRateLimit(
	event: RequestEvent
): Promise<{ limited: boolean; retryAfter: number }> {
	const pathname = event.url.pathname;

	if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return { limited: false, retryAfter: 0 };
	}

	const ip = event.getClientAddress();
	const limiter = event.locals.user ? authLimiter : anonLimiter;

	try {
		await limiter.consume(ip);
		return { limited: false, retryAfter: 0 };
	} catch (err) {
		const res = err as { msBeforeNextReset: number };
		const retryAfter = Math.ceil(res.msBeforeNextReset / 1000);
		return { limited: true, retryAfter };
	}
}
