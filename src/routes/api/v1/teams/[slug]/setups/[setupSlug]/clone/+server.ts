import type { RequestHandler } from './$types';
import { error } from '$lib/server/responses';
import { getTeamSetupBySlug } from '$lib/server/queries/teams';
import { canViewSetup } from '$lib/server/queries/access';
import { recordClone } from '$lib/server/queries/setups';

export const POST: RequestHandler = async ({ params, locals }) => {
	const setup = await getTeamSetupBySlug(params.slug, params.setupSlug);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	if (!(await canViewSetup(setup, locals.user?.id))) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	await recordClone(setup.id);
	return new Response(null, { status: 204 });
};
