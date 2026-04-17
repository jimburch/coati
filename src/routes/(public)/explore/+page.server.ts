import type { PageServerLoad } from './$types';
import type { ExploreSort } from '$lib/types';
import {
	searchSetups,
	getAllAgentsWithSetupCount,
	getAgentsForSetups
} from '$lib/server/queries/setups';
import { searchUsers } from '$lib/server/queries/users';

const VALID_SORTS: ExploreSort[] = ['trending', 'stars', 'newest'];

export const load: PageServerLoad = async ({ url, locals }) => {
	const q = url.searchParams.get('q') || undefined;
	const agents = url.searchParams.getAll('agent').filter(Boolean);
	const sortParam = url.searchParams.get('sort') || 'trending';
	const sort: ExploreSort = VALID_SORTS.includes(sortParam as ExploreSort)
		? (sortParam as ExploreSort)
		: 'trending';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const viewerId = locals.user?.id;

	const [results, allAgents, userResults] = await Promise.all([
		searchSetups({
			q,
			agentSlugs: agents.length > 0 ? agents : undefined,
			sort,
			page,
			viewerId
		}),
		getAllAgentsWithSetupCount(),
		q ? searchUsers(q, 6) : Promise.resolve([])
	]);

	const agentsMap = await getAgentsForSetups(results.items.map((s) => s.id));

	return {
		...results,
		items: results.items.map((s) => ({
			...s,
			agents: agentsMap[s.id] ?? []
		})),
		q,
		agents,
		sort,
		allAgents,
		userResults
	};
};
