import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getInviteByToken, isInviteValid } from '$lib/server/queries/teams';

export const GET: RequestHandler = async (event) => {
	const invite = await getInviteByToken(event.params.token);
	if (!invite) return error('Invite not found', 'NOT_FOUND', 404);

	const valid = isInviteValid(invite);

	return success({
		id: invite.id,
		token: invite.token,
		status: invite.status,
		expiresAt: invite.expiresAt,
		isValid: valid,
		teamId: invite.teamId,
		teamName: invite.teamName,
		teamSlug: invite.teamSlug,
		teamDescription: invite.teamDescription,
		teamAvatarUrl: invite.teamAvatarUrl,
		invitedByUsername: invite.invitedByUsername,
		invitedByAvatarUrl: invite.invitedByAvatarUrl
	});
};
