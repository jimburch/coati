import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';

export const GET: RequestHandler = async ({ params, locals }) => {
	const setup = await setupRepo.getTeamSetupDetail(params.slug, params.setupSlug, locals.user?.id);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	return success(setup);
};
