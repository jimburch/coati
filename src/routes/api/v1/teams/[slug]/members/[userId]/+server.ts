import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error, parseRequestBody } from '$lib/server/responses';
import { changeTeamMemberRoleSchema } from '$lib/types';
import {
	getTeamBySlugForAuth,
	getTeamMemberRole,
	removeTeamMember,
	changeTeamMemberRole
} from '$lib/server/queries/teams';

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	const targetUserId = event.params.userId;
	const isSelf = targetUserId === user.id;

	if (isSelf) {
		if (team.ownerId === user.id) {
			return error(
				'The owner cannot leave the team. Delete the team instead.',
				'OWNER_CANNOT_LEAVE',
				400
			);
		}
		const role = await getTeamMemberRole(team.id, user.id);
		if (!role) return error('Not a team member', 'FORBIDDEN', 403);
	} else {
		const callerRole = await getTeamMemberRole(team.id, user.id);
		const callerIsOwner = team.ownerId === user.id;
		if (!callerIsOwner && callerRole !== 'admin') {
			return error('Only owners and admins can remove members', 'FORBIDDEN', 403);
		}
		if (targetUserId === team.ownerId) {
			return error('Cannot remove the team owner', 'CANNOT_REMOVE_OWNER', 400);
		}
	}

	await removeTeamMember(team.id, targetUserId, team.ownerId);
	return success({ removed: true });
};

export const PATCH: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const team = await getTeamBySlugForAuth(event.params.slug);
	if (!team) return error('Team not found', 'NOT_FOUND', 404);

	if (team.ownerId !== user.id) {
		return error('Only the team owner can change member roles', 'FORBIDDEN', 403);
	}

	const targetUserId = event.params.userId;
	if (targetUserId === user.id) {
		return error('Cannot change your own role', 'CANNOT_CHANGE_OWN_ROLE', 400);
	}

	const parsed = await parseRequestBody(event.request, changeTeamMemberRoleSchema);
	if (parsed instanceof Response) return parsed;

	const updated = await changeTeamMemberRole(team.id, targetUserId, parsed.role);
	if (!updated) return error('Member not found', 'NOT_FOUND', 404);

	return success(updated);
};
