import type { RequestHandler } from './$types';
import { success, error } from '$lib/server/responses';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { track } from '$lib/server/observability/mixpanel';

export const POST: RequestHandler = async ({ params, locals }) => {
	const setup = await setupRepo.getByOwnerSlug(params.owner, params.slug, locals.user?.id);
	if (!setup) {
		return error('Setup not found', 'NOT_FOUND', 404);
	}
	await setupRepo.recordClone(setup.id);

	track('Setup Cloned', { setup_id: setup.id }, { locals });

	return success({ cloned: true, clonesCount: setup.clonesCount + 1 });
};
