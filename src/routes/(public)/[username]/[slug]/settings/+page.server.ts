import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { updateSetup } from '$lib/server/queries/setups';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login/github');

	const setup = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
	if (!setup) throw error(404, 'Setup not found');
	if (setup.userId !== locals.user.id) throw error(403, 'Forbidden');

	return {
		setup,
		user: locals.user
	};
};

export const actions: Actions = {
	setVisibility: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const setup = await setupRepo.getDetail(params.username, params.slug, locals.user.id);
		if (!setup) throw error(404, 'Setup not found');
		if (setup.userId !== locals.user.id) {
			return fail(403, { error: 'You do not own this setup', code: 'FORBIDDEN' });
		}

		const formData = await request.formData();
		const visibility = formData.get('visibility');

		if (visibility !== 'public' && visibility !== 'private') {
			return fail(400, { error: 'Invalid visibility value', code: 'INVALID_VISIBILITY' });
		}

		if (visibility === 'private' && !locals.user.hasBetaFeatures) {
			return fail(403, {
				error: 'Private setups require beta features access',
				code: 'BETA_REQUIRED'
			});
		}

		await updateSetup(setup.id, { visibility });

		return { visibility };
	}
};
