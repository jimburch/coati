import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { declineInvite } from '$lib/server/queries/teams';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const result = await declineInvite(event.params.token, user.id);
	if (!result.ok) {
		const status = result.code === 'NOT_FOUND' ? 404 : result.code === 'FORBIDDEN' ? 403 : 409;
		return error(result.error, result.code, status);
	}

	return success({ declined: true });
};
