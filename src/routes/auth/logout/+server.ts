import { redirect, type RequestHandler } from '@sveltejs/kit';
import { invalidateSession, deleteSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) {
		await invalidateSession(locals.session.id);
	}
	deleteSessionCookie(cookies);
	return redirect(302, '/');
};
