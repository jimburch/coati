import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { getTeamBySlugForAuth, getTeamMemberRole, getTeamMembers } from '$lib/server/queries/teams';

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
