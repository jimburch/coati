import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { updateTeamSchema } from '$lib/types';
import {
	getTeamBySlug,
	getTeamBySlugForAuth,
	getTeamMemberRole,
	updateTeam,
	deleteTeam
} from '$lib/server/queries/teams';

export const GET: RequestHandler = async ({ params }) => {
	const team = await getTeamBySlug(params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);
	return success(team);
};

export const PATCH: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	const role = await getTeamMemberRole(team.id, user.id);
	if (role !== 'admin' && team.ownerId !== user.id) {
		return error('Only team admins can update team settings', 'FORBIDDEN', 403);
	}

	const parsed = await parseRequestBody(event.request, updateTeamSchema);
	if (parsed instanceof Response) return parsed;

	const updated = await updateTeam(team.id, parsed);
	if (!updated) return error('Team not found', 'NOT_FOUND', 404);

	return success(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	if (team.ownerId !== user.id) {
		return error('Only the team owner can delete a team', 'FORBIDDEN', 403);
	}

	await deleteTeam(team.id);
	return success({ deleted: true });
};
