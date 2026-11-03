import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { movedPermanently, resolveTeamSetup } from '$lib/server/setupLookup';
import { setupReadExtras } from '$lib/server/readApi';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const found = await resolveTeamSetup(params.slug, params.setupSlug, locals.user?.id);
	if (!found) return error('Setup not found', 'NOT_FOUND', 404);
	if (found.renamed) {
		return movedPermanently(
			url,
			`/api/v1/teams/${params.slug}/setups/${params.setupSlug}`,
			`/api/v1/teams/${params.slug}/setups/${found.setup.slug}`
		);
	}
	const setup = await setupRepo.getTeamSetupDetail(params.slug, params.setupSlug, locals.user?.id);
	if (!setup) return error('Setup not found', 'NOT_FOUND', 404);
	return success({ ...setup, ...(await setupReadExtras(setup.id)) });
};
