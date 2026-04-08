import type { Handle } from '@sveltejs/kit';
import {
	validateSessionToken,
	getSessionToken,
	deleteSessionCookie,
	setSessionCookie
} from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';
import { env } from '$env/dynamic/public';
import { startScheduler } from '$lib/server/scheduler';

startScheduler();

type GateEvent = {
	locals: { user: { isBetaApproved: boolean; isAdmin: boolean } | null };
	url: { pathname: string };
};

export function betaGate(event: GateEvent, betaModeEnabled: boolean): Response | null {
	if (!betaModeEnabled) return null;

	const { pathname } = event.url;

	if (pathname.startsWith('/api/')) return null;

	const isAllowedWithoutAuth =
		pathname === '/' || pathname.startsWith('/auth/') || pathname === '/waitlist';

	if (!event.locals.user) {
		if (!isAllowedWithoutAuth) {
			return new Response(null, {
				status: 302,
				headers: { Location: '/auth/login/github' }
			});
		}
		return null;
	}

	if (!event.locals.user.isBetaApproved && !event.locals.user.isAdmin && pathname !== '/waitlist') {
		return new Response(null, {
			status: 302,
			headers: { Location: '/waitlist' }
		});
	}

	return null;
}

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

	// Beta gate check (runs after auth so event.locals.user is populated, before rate limit)
	const gateResponse = betaGate(event, env.PUBLIC_BETA_MODE === 'true');
	if (gateResponse) return gateResponse;

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
