import { redirect, type RequestHandler } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { github } from '$lib/server/auth';
import { generateState } from 'arctic';
import { isSafeInternalRedirect } from '@coati/validation';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const state = generateState();
	const authUrl = github.createAuthorizationURL(state, ['read:user', 'user:email']);
	authUrl.searchParams.set('prompt', 'consent');

	cookies.set('github_oauth_state', state, {
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 10 // 10 minutes
	});

	const redirectTo = url.searchParams.get('redirect');
	if (isSafeInternalRedirect(redirectTo)) {
		cookies.set('oauth_redirect', redirectTo as string, {
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 10
		});
	}

	return redirect(302, authUrl.toString());
};
