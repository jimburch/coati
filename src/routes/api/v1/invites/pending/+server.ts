import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success } from '$lib/server/responses';
import { getPendingInvites } from '$lib/server/queries/teams';

export const GET: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const invites = await getPendingInvites(user.id);
	return success(invites);
};
