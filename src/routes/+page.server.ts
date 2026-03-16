import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { searchSetups, getToolsForSetups } from '$lib/server/queries/setups';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(302, '/explore');
	}

	const results = await searchSetups({ sort: 'trending', page: 1 });
	const setupIds = results.items.slice(0, 6).map((s) => s.id);
	const toolsMap = await getToolsForSetups(setupIds);

	return {
		trendingSetups: results.items.slice(0, 6).map((s) => ({
			...s,
			tools: toolsMap[s.id] ?? []
		}))
	};
};
