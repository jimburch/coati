import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceFlowStates } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
	upsertGithubUser,
	generateSessionToken,
	createSession
} from '$lib/server/auth';
import { success, error } from '$lib/server/responses';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as { deviceCode?: string };

	if (!body.deviceCode) {
		return error('deviceCode is required', 'VALIDATION_ERROR', 400);
	}

	const state = await db.query.deviceFlowStates.findFirst({
		where: eq(deviceFlowStates.deviceCode, body.deviceCode)
	});

	if (!state) {
		return error('Unknown device code', 'NOT_FOUND', 404);
	}

	if (state.expiresAt.getTime() < Date.now()) {
		await db.delete(deviceFlowStates).where(eq(deviceFlowStates.id, state.id));
		return error('Device code expired', 'EXPIRED', 410);
	}

	// Poll GitHub for access token
	const ghRes = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			client_secret: GITHUB_CLIENT_SECRET,
			device_code: state.githubDeviceCode,
			grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
		})
	});

	const ghData = (await ghRes.json()) as {
		access_token?: string;
		error?: string;
	};

	if (ghData.error === 'authorization_pending') {
		return new Response(JSON.stringify({ data: { status: 'pending' } }), {
			status: 202,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (ghData.error === 'slow_down') {
		return new Response(JSON.stringify({ data: { status: 'slow_down' } }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (ghData.error || !ghData.access_token) {
		return error(ghData.error ?? 'Unknown error', 'DEVICE_FLOW_ERROR', 400);
	}

	// Success — upsert user, create session, clean up
	const userId = await upsertGithubUser(ghData.access_token);
	const token = generateSessionToken();
	await createSession(token, userId);

	// Clean up device flow state
	await db.delete(deviceFlowStates).where(eq(deviceFlowStates.id, state.id));

	return success({ token });
};
