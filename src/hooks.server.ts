import type { Cookies, Handle, HandleServerError } from '@sveltejs/kit';
import type { ThemePreference } from '$lib/utils/theme';
import {
	validateSessionToken,
	getSessionToken,
	deleteSessionCookie,
	setSessionCookie
} from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/rate-limit';
import { env } from '$env/dynamic/public';
import { startScheduler } from '$lib/server/scheduler';
import { detectSurface } from '$lib/server/observability/surface';
import { initSentry, setSentryUser } from '$lib/server/observability/sentry';
import * as Sentry from '@sentry/sveltekit';

startScheduler();
initSentry();

const VALID_THEMES: ThemePreference[] = ['light', 'dark', 'system'];

export function getThemeFromCookie(cookies: Cookies): ThemePreference {
	const value = cookies.get('theme');
	if (value && VALID_THEMES.includes(value as ThemePreference)) {
		return value as ThemePreference;
	}
	return 'dark';
}

type GateEvent = {
	locals: { user: { isBetaApproved: boolean; isAdmin: boolean } | null };
	url: { pathname: string };
};

export function betaGate(event: GateEvent, betaModeEnabled: boolean): Response | null {
	if (!betaModeEnabled) return null;

	const { pathname } = event.url;

	if (pathname.startsWith('/api/')) return null;

	if (!event.locals.user) {
		return null;
	}

	const isGatedRoute =
		pathname.startsWith('/new') ||
		pathname.startsWith('/settings') ||
		pathname.startsWith('/feed') ||
		pathname.startsWith('/admin');

	if (!event.locals.user.isBetaApproved && !event.locals.user.isAdmin && isGatedRoute) {
		return new Response(null, {
			status: 302,
			headers: { Location: '/waitlist' }
		});
	}

	return null;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Surface detection — identify web vs CLI requests
	const { surface, cliVersion } = detectSurface(event.request.headers.get('user-agent'));
	event.locals.surface = surface;
	event.locals.cliVersion = cliVersion;

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

	// Sentry user context — set after auth resolution
	if (event.locals.user) {
		setSentryUser({ id: event.locals.user.id, username: event.locals.user.username });
	}

	// Tag every request with surface and cli_version for Sentry context
	Sentry.setContext('request_meta', {
		surface: event.locals.surface,
		cli_version: event.locals.cliVersion
	});

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

	const theme = getThemeFromCookie(event.cookies);
	// For 'system', default to dark on server (client JS will correct based on prefers-color-scheme)
	const themeClass = theme === 'light' ? '' : 'dark';

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%coati.theme%', themeClass)
	});
};

export const handleError: HandleServerError = ({ error, event }) => {
	// Build sanitized headers — strip Authorization and Cookie to avoid leaking credentials
	const sanitizedHeaders: Record<string, string> = {};
	event.request.headers.forEach((value, key) => {
		const lower = key.toLowerCase();
		if (lower !== 'authorization' && lower !== 'cookie') {
			sanitizedHeaders[key] = value;
		}
	});

	Sentry.captureException(error, {
		extra: {
			url: event.url.href,
			method: event.request.method,
			routeParams: event.params,
			headers: sanitizedHeaders
		}
	});

	return { message: 'An unexpected error occurred' };
};
