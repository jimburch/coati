import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getSetupByOwnerSlug, getSetupFiles } from '$lib/server/queries/setups';

export const GET: RequestHandler = async ({ params }) => {
	const setup = await getSetupByOwnerSlug(params.owner, params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	const files = await getSetupFiles(setup.id);
	return success(files);
};
