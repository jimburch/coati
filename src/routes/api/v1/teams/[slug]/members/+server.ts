import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import {
	getTeamBySlugForAuth,
	getTeamMemberRole,
	getTeamMembers,
	createInviteByUsername
} from '$lib/server/queries/teams';
import { createInviteSchema } from '$lib/types';

export const GET: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	const isOwner = team.ownerId === user.id;
	const role = await getTeamMemberRole(team.id, user.id);
	if (!isOwner && !role) return error('Not a team member', 'FORBIDDEN', 403);

	const members = await getTeamMembers(team.id);
	return success(members);
};

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	const isOwner = team.ownerId === user.id;
	const role = await getTeamMemberRole(team.id, user.id);
	if (!isOwner && role !== 'admin') {
		return error('Only team owners and admins can invite members', 'FORBIDDEN', 403);
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return error('Invalid JSON', 'BAD_REQUEST', 400);
	}

	const parsed = createInviteSchema.safeParse(body);
	if (!parsed.success) {
		return error(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
	}

	const result = await createInviteByUsername(team.id, user.id, parsed.data.username);
	if (!result.ok) {
		const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'RATE_LIMIT' ? 429 : 409;
		return error(result.error, result.code, status);
	}

	return success({ token: result.invite.token }, 201);
};
