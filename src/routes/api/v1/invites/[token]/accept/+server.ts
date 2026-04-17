import type { RequestHandler } from './$types';
import { requireBetaFeatures } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { acceptInvite } from '$lib/server/queries/teams';

export const POST: RequestHandler = async (event) => {
	const authResult = requireBetaFeatures(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const result = await acceptInvite(event.params.token, user.id);
	if (!result.ok) {
		const status =
			result.code === 'NOT_FOUND'
				? 404
				: result.code === 'FORBIDDEN'
					? 403
					: result.code === 'EXPIRED'
						? 410
						: 409;
		return error(result.error, result.code, status);
	}

	return success({ accepted: true });
};
