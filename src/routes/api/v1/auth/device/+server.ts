import crypto from 'node:crypto';
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { deviceFlowStates } from '$lib/server/db/schema';
import { success, error } from '$lib/server/responses';
import { GITHUB_CLIENT_ID } from '$env/static/private';

export const POST: RequestHandler = async () => {
	// Request device code from GitHub
	const ghRes = await fetch('https://github.com/login/device/code', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			client_id: GITHUB_CLIENT_ID,
			scope: 'read:user user:email'
		})
	});

	if (!ghRes.ok) {
		return error('Failed to initiate device flow', 'DEVICE_FLOW_ERROR', 502);
	}

	const ghData = (await ghRes.json()) as {
		device_code: string;
		user_code: string;
		verification_uri: string;
		expires_in: number;
		interval: number;
	};

	// Generate our own device code for the CLI to poll with
	const deviceCode = crypto.randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + ghData.expires_in * 1000);

	await db.insert(deviceFlowStates).values({
		deviceCode,
		userCode: ghData.user_code,
		githubDeviceCode: ghData.device_code,
		expiresAt
	});

	return success({
		deviceCode,
		userCode: ghData.user_code,
		verificationUri: ghData.verification_uri,
		expiresIn: ghData.expires_in,
		interval: ghData.interval
	});
};
