import { redirect, type RequestHandler } from '@sveltejs/kit';
import {
	github,
	upsertGithubUser,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import { error } from '$lib/server/responses';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('github_oauth_state');

	if (!code || !state || !storedState || state !== storedState) {
		return error('Invalid OAuth state', 'INVALID_STATE', 400);
	}

	cookies.delete('github_oauth_state', { path: '/' });

	let accessToken: string;
	try {
		const tokens = await github.validateAuthorizationCode(code);
		accessToken = tokens.accessToken();
	} catch {
		return error('Failed to exchange authorization code', 'OAUTH_ERROR', 400);
	}

	let userId: string;
	try {
		userId = await upsertGithubUser(accessToken);
	} catch {
		return error('Failed to fetch GitHub user', 'GITHUB_ERROR', 500);
	}

	const token = generateSessionToken();
	await createSession(token, userId);
	setSessionCookie(cookies, token);

	return redirect(302, '/');
};
