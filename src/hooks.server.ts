import type { Handle } from '@sveltejs/kit';
import { validateSessionToken, getSessionToken, deleteSessionCookie, setSessionCookie } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Try cookie first (web), then Bearer token (CLI)
	const cookieToken = getSessionToken(event.cookies);
	const bearerToken = event.request.headers.get('Authorization')?.replace('Bearer ', '');
	const token = cookieToken ?? bearerToken;

	if (!token) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const result = await validateSessionToken(token);

	if (!result) {
		// Invalid token — clean up cookie if it was a cookie
		if (cookieToken) {
			deleteSessionCookie(event.cookies);
		}
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	event.locals.user = result.user;
	event.locals.session = result.session;

	// Refresh cookie if session was extended (sliding window)
	if (cookieToken) {
		setSessionCookie(event.cookies, cookieToken);
	}

	return resolve(event);
};
