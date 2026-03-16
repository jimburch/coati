import type { PageServerLoad } from './$types';
import type { ExploreSort } from '$lib/types';
import {
	searchSetups,
	getAllTools,
	getAllTags,
	getToolsForSetups
} from '$lib/server/queries/setups';

const VALID_SORTS: ExploreSort[] = ['trending', 'stars', 'clones', 'newest'];

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q') || undefined;
	const tool = url.searchParams.get('tool') || undefined;
	const tag = url.searchParams.get('tag') || undefined;
	const sortParam = url.searchParams.get('sort') || 'newest';
	const sort: ExploreSort = VALID_SORTS.includes(sortParam as ExploreSort)
		? (sortParam as ExploreSort)
		: 'newest';
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);

	const [results, allTools, allTags] = await Promise.all([
		searchSetups({ q, toolSlug: tool, tagName: tag, sort, page }),
		getAllTools(),
		getAllTags()
	]);

	const toolsMap = await getToolsForSetups(results.items.map((s) => s.id));

	return {
		...results,
		items: results.items.map((s) => ({
			...s,
			tools: toolsMap[s.id] ?? []
		})),
		q,
		tool,
		tag,
		sort,
		allTools,
		allTags
	};
};
