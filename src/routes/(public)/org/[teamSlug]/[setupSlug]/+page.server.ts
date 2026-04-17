import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { setupRepo } from '$lib/server/queries/setupRepository';
import { renderMarkdown } from '$lib/server/markdown';
import { getTeamBySlugForAuth, getTeamMemberRole } from '$lib/server/queries/teams';

export const load: PageServerLoad = async ({ params, locals }) => {
	const detail = await setupRepo.getTeamSetupDetail(
		params.teamSlug,
		params.setupSlug,
		locals.user?.id
	);
	if (!detail) throw error(404, 'Setup not found');

	const readmeHtml = detail.readme ? await renderMarkdown(detail.readme) : null;

	let viewerRole: 'admin' | 'member' | null = null;
	if (locals.user && detail.teamId) {
		const team = await getTeamBySlugForAuth(params.teamSlug);
		if (team) {
			viewerRole = await getTeamMemberRole(team.id, locals.user.id);
			if (team.ownerId === locals.user.id) viewerRole = 'admin';
		}
	}

	return {
		setup: detail,
		files: detail.files,
		tags: detail.tags,
		agents: detail.agents,
		readmeHtml,
		isStarred: detail.isStarred,
		user: locals.user ?? null,
		viewerRole
	};
};
