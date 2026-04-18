import { redirect, type RequestEvent } from '@sveltejs/kit';
import { error } from '$lib/server/responses';
import type { User } from '$lib/types';

/**
 * For page loads — redirects to login if not authenticated.
 */
export function requireAuth(event: RequestEvent): User {
	if (!event.locals.user) {
		throw redirect(302, '/auth/login/github');
	}
	return event.locals.user;
}

/**
 * For API routes — returns 401 JSON if not authenticated.
 */
export function requireApiAuth(event: RequestEvent): User | Response {
	if (!event.locals.user) {
		return error('Authentication required', 'UNAUTHORIZED', 401);
	}
	return event.locals.user;
}

/**
 * For admin API routes — returns 401/403 JSON if not authenticated or not admin.
 */
export function requireAdmin(event: RequestEvent): User | Response {
	const result = requireApiAuth(event);
	if (result instanceof Response) return result;
	if (!result.isAdmin) {
		return error('Admin access required', 'FORBIDDEN', 403);
	}
	return result;
}
