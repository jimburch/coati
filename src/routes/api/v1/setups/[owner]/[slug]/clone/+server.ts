import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getSetupByOwnerSlug, recordClone } from '$lib/server/queries/setups';

export const POST: RequestHandler = async ({ params }) => {
	const setup = await getSetupByOwnerSlug(params.owner, params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	await recordClone(setup.id);
	return success({ cloned: true, clonesCount: setup.clonesCount + 1 });
};
