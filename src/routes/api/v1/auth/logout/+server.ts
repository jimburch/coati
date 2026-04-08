import type { RequestHandler } from '@sveltejs/kit';
import { validateSessionToken, invalidateSession } from '$lib/server/auth';
import { success, error } from '$lib/server/responses';

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return error('Missing or invalid Authorization header', 'UNAUTHORIZED', 401);
	}

	const token = authHeader.slice(7);

	if (!token) {
		return error('Missing token', 'UNAUTHORIZED', 401);
	}

	const result = await validateSessionToken(token);

	if (!result) {
		return error('Invalid or expired token', 'UNAUTHORIZED', 401);
	}

	await invalidateSession(result.session.id);

	return success({ success: true });
};
