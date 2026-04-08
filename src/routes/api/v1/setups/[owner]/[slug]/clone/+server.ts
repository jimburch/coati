import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';

export const POST: RequestHandler = async ({ params }) => {
	const setup = await setupRepo.getByOwnerSlug(params.owner, params.slug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	await setupRepo.recordClone(setup.id);
	return success({ cloned: true, clonesCount: setup.clonesCount + 1 });
};
