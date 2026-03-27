import type { Handle } from '@sveltejs/kit';
import {
	validateSessionToken,
	getSessionToken,
	deleteSessionCookie,
	setSessionCookie
} from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';

export const handle: Handle = async ({ event, resolve }) => {
	// Auth resolution — must happen before rate limit so event.locals.user is populated
	const cookieToken = getSessionToken(event.cookies);
	const bearerToken = event.request.headers.get('Authorization')?.replace('Bearer ', '');
	const token = cookieToken ?? bearerToken;

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const result = await validateSessionToken(token);

		if (!result) {
			// Invalid token — clean up cookie if it was a cookie
			if (cookieToken) {
				deleteSessionCookie(event.cookies);
			}
			event.locals.user = null;
			event.locals.session = null;
		} else {
			event.locals.user = result.user;
			event.locals.session = result.session;

			// Refresh cookie if session was extended (sliding window)
			if (cookieToken) {
				setSessionCookie(event.cookies, cookieToken);
			}
		}
	}

	// Rate limit check (runs after auth so event.locals.user is already populated)
	const { limited, retryAfter } = await checkRateLimit(event);
	if (limited) {
		return new Response(JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }), {
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(retryAfter)
			}
		});
	}

	return resolve(event);
};
