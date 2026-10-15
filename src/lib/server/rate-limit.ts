import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const STATIC_PREFIXES = ['/_app/', '/favicon'];

/**
 * Cloudflare rate limiting binding. Counts are per location and approximate.
 * Signed-in requests are keyed by user id; everyone else by client IP
 * (`getClientAddress()`, which is `cf-connecting-ip` on Workers).
 * The binding does not report time remaining, so a rejection retries after 60s.
 */
export async function checkRateLimit(
	event: RequestEvent
): Promise<{ limited: boolean; retryAfter: number }> {
	if (env.DISABLE_RATE_LIMIT === 'true') {
		return { limited: false, retryAfter: 0 };
	}

	const pathname = event.url.pathname;
	if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return { limited: false, retryAfter: 0 };
	}

	const userId = event.locals.user?.id;
	const binding = userId ? event.platform?.env.RL_AUTH : event.platform?.env.RL_ANON;
	if (!binding) {
		throw new Error('Rate limit binding is not configured');
	}

	const key = userId ?? event.getClientAddress();
	const { success } = await binding.limit({ key });
	if (!success) {
		return { limited: true, retryAfter: 60 };
	}
	return { limited: false, retryAfter: 0 };
}
