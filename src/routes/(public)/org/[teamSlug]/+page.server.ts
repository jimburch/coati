import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeamBySlug, getTeamMemberRole } from '$lib/server/queries/teams';

export const load: PageServerLoad = async ({ params, locals }) => {
	const team = await getTeamBySlug(params.teamSlug, locals.user?.id);
	if (!team) throw error(404, 'Team not found');

	const isOwner = locals.user ? team.ownerId === locals.user.id : false;
	const role = locals.user ? await getTeamMemberRole(team.id, locals.user.id) : null;
	const isAdmin = isOwner || role === 'admin';
	const isMember = isOwner || role !== null;

	return { team, isOwner, isAdmin, isMember };
};
