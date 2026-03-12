import { redirect, type RequestHandler } from '@sveltejs/kit';
import { github } from '$lib/server/auth';
import { generateState } from 'arctic';

export const GET: RequestHandler = async ({ cookies }) => {
	const state = generateState();
	const url = github.createAuthorizationURL(state, ['read:user', 'user:email']);

	cookies.set('github_oauth_state', state, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 10 // 10 minutes
	});

	return redirect(302, url.toString());
};
