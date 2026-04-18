import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import {
	getTeamBySlugForAuth,
	getTeamMemberRole,
	createInviteLink
} from '$lib/server/queries/teams';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	const isOwner = team.ownerId === user.id;
	const role = await getTeamMemberRole(team.id, user.id);
	if (!isOwner && role !== 'admin') {
		return error('Only team owners and admins can generate invite links', 'FORBIDDEN', 403);
	}

	const result = await createInviteLink(team.id, user.id);
	if (!result.ok) {
		return error(result.error, result.code, 500);
	}

	const origin = event.url.origin;
	const inviteUrl = `${origin}/invite/${result.token}`;

	return success({ token: result.token, inviteUrl }, 201);
};
