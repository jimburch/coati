import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeamBySlug } from '$lib/server/queries/teams';

export const load: PageServerLoad = async ({ params, locals }) => {
	const team = await getTeamBySlug(params.teamSlug, locals.user?.id);
	if (!team) throw error(404, 'Team not found');
	return { team };
};
