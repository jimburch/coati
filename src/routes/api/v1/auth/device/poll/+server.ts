import type { RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { deviceFlowStates, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { upsertGithubUser, generateSessionToken, createSession } from '$lib/server/auth';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { env } from '$env/dynamic/private';
const GITHUB_CLIENT_ID = env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = env.GITHUB_CLIENT_SECRET!;
import { updateLastLoginAt } from '$lib/server/queries/users';

const deviceCodeSchema = z.object({ deviceCode: z.string().min(1) });

export const POST: RequestHandler = async ({ request }) => {
	const parsed = await parseRequestBody(request, deviceCodeSchema);
	if (parsed instanceof Response) return parsed;

	const state = await db.query.deviceFlowStates.findFirst({
		where: eq(deviceFlowStates.deviceCode, parsed.deviceCode)
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
	await updateLastLoginAt(userId);

	// Clean up device flow state
	await db.delete(deviceFlowStates).where(eq(deviceFlowStates.id, state.id));

	const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
	const username = user?.username ?? '';

	return success({ token, username });
};
