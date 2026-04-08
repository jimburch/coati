import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { setStar } from '$lib/server/queries/setups';
import { setupRepo } from '$lib/server/queries/setupRepository';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const result = await setStar(user.id, setup.id, true);
	return success({ starred: result.starred, starsCount: result.starsCount });
};

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await setupRepo.getByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const result = await setStar(user.id, setup.id, false);
	return success({ starred: result.starred, starsCount: result.starsCount });
};
