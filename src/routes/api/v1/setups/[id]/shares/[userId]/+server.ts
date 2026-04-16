import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { getSetupByIdWithOwner } from '$lib/server/queries/setups';
import { unshareSetup } from '$lib/server/queries/setupShares';

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByIdWithOwner(event.params.id);
	if (!setup) return error('Setup not found', 'NOT_FOUND', 404);
	if (setup.userId !== user.id) return error('You do not own this setup', 'FORBIDDEN', 403);

	await unshareSetup(setup.id, event.params.userId);
	return success({ revoked: true });
};
