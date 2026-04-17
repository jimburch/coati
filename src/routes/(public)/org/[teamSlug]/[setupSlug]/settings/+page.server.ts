import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { updateSetup } from '$lib/server/queries/setups';
import { getTeamBySlugForAuth, getTeamMemberRole } from '$lib/server/queries/teams';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) throw redirect(302, '/auth/login/github');

	const team = await getTeamBySlugForAuth(params.teamSlug);
	if (!team) throw error(404, 'Team not found');

	const role = await getTeamMemberRole(team.id, locals.user.id);
	const isOwner = team.ownerId === locals.user.id;
	const isAdmin = isOwner || role === 'admin';
	const isMember = role !== null;

	if (!isMember && !isOwner) throw error(403, 'Forbidden');

	const setup = await setupRepo.getTeamSetupDetail(
		params.teamSlug,
		params.setupSlug,
		locals.user.id
	);
	if (!setup) throw error(404, 'Setup not found');

	return {
		setup,
		user: locals.user,
		isAdmin,
		teamSlug: params.teamSlug
	};
};

export const actions: Actions = {
	setVisibility: async ({ locals, params, request }) => {
		if (!locals.user) throw redirect(302, '/auth/login/github');

		const team = await getTeamBySlugForAuth(params.teamSlug);
		if (!team) throw error(404, 'Team not found');

		const role = await getTeamMemberRole(team.id, locals.user.id);
		const isOwner = team.ownerId === locals.user.id;
		const isAdmin = isOwner || role === 'admin';

		if (!isAdmin) {
			return fail(403, {
				error: 'Only team owners and admins can change setup visibility',
				code: 'FORBIDDEN'
			});
		}

		const setup = await setupRepo.getTeamSetupDetail(
			params.teamSlug,
			params.setupSlug,
			locals.user.id
		);
		if (!setup) throw error(404, 'Setup not found');

		const formData = await request.formData();
		const visibility = formData.get('visibility');

		if (visibility !== 'public' && visibility !== 'private') {
			return fail(400, { error: 'Invalid visibility value', code: 'INVALID_VISIBILITY' });
		}

		await updateSetup(setup.id, { visibility });

		return { visibility };
	}
};
