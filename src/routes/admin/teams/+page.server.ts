import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAllTeamsWithAdminDetails, adminDeleteTeam } from '$lib/server/queries/admin';
import { getTeamBySlugForAuth } from '$lib/server/queries/teams';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/auth/login/github');
	}
	if (!locals.user.isAdmin) {
		throw error(403, 'Forbidden');
	}

	const search = url.searchParams.get('q') || undefined;
	const teams = await getAllTeamsWithAdminDetails(search);

	return { teams, search: search ?? '' };
};

export const actions: Actions = {
	deleteTeam: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(302, '/auth/login/github');
		}
		if (!locals.user.isAdmin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await request.formData();
		const slug = formData.get('slug') as string;
		const confirmName = formData.get('confirmName') as string;

		if (!slug) {
			return fail(400, { deleteError: 'Missing team slug' });
		}

		const team = await getTeamBySlugForAuth(slug);
		if (!team) {
			return fail(404, { deleteError: 'Team not found' });
		}
		if (confirmName !== team.name) {
			return fail(400, { deleteError: 'Team name does not match' });
		}

		await adminDeleteTeam(team.id);
		return { deleted: true };
	}
};
