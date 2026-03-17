import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import {
	getSetupByOwnerSlug,
	isSetupStarredByUser,
	toggleStar
} from '$lib/server/queries/setups';

export const POST: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const alreadyStarred = await isSetupStarredByUser(setup.id, user.id);

	if (!alreadyStarred) {
		await toggleStar(user.id, setup.id);
	}

	const updated = await getSetupByOwnerSlug(event.params.owner, event.params.slug);
	return success({ starred: true, starsCount: updated!.starsCount });
};

export const DELETE: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const setup = await getSetupByOwnerSlug(event.params.owner, event.params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}

	const alreadyStarred = await isSetupStarredByUser(setup.id, user.id);

	if (alreadyStarred) {
		await toggleStar(user.id, setup.id);
	}

	const updated = await getSetupByOwnerSlug(event.params.owner, event.params.slug);
	return success({ starred: false, starsCount: updated!.starsCount });
};
