import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { getTeamSetupBySlug } from '$lib/server/queries/teams';
import { canViewSetup } from '$lib/server/queries/access';
import { getSetupFiles } from '$lib/server/queries/setups';

export const GET: RequestHandler = async ({ params, locals }) => {
	const setup = await getTeamSetupBySlug(params.slug, params.setupSlug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (!(await canViewSetup(setup, locals.user?.id))) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	const files = await getSetupFiles(setup.id);
	return success(files);
};
