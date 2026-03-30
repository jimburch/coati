import type { PageServerLoad } from './$types';
import type { ExploreSort } from '$lib/types';
import {
	getFeaturedSetups,
	getTrendingSetups,
	getRecentSetups,
	getAgentsForSetups,
	searchSetups,
	getAllAgentsWithSetupCount,
	getAllTags
} from '$lib/server/queries/setups';

const VALID_SORTS: ExploreSort[] = ['trending', 'stars', 'clones', 'newest'];

type DashboardSetup = {
	id: string;
	name: string;
	slug: string;
	description: string;
	starsCount: number;
	clonesCount: number;
	updatedAt: Date;
	ownerUsername: string;
	ownerAvatarUrl: string | undefined;
	agents: { id: string; displayName: string; slug: string }[];
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const q = url.searchParams.get('q') || undefined;
		const agents = url.searchParams.getAll('agent').filter(Boolean);
		const tag = url.searchParams.get('tag') || undefined;
		const sortParam = url.searchParams.get('sort') || 'newest';
		const sort: ExploreSort = VALID_SORTS.includes(sortParam as ExploreSort)
			? (sortParam as ExploreSort)
			: 'newest';
		const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
		const searchActive = !!q || agents.length > 0 || !!tag || sort !== 'newest';

		const [featured, trending, recent, allAgents, allTags] = await Promise.all([
			getFeaturedSetups(5),
			getTrendingSetups(6),
			getRecentSetups(6),
			getAllAgentsWithSetupCount(),
			getAllTags()
		]);

		const dashboardIds = [
			...featured.map((s) => s.id),
			...trending.map((s) => s.id),
			...recent.map((s) => s.id)
		];
		const dashboardAgentsMap =
			dashboardIds.length > 0 ? await getAgentsForSetups(dashboardIds) : {};

		const toCard = (s: {
			id: string;
			name: string;
			slug: string;
			description: string;
			starsCount: number;
			clonesCount: number;
			updatedAt: Date;
			ownerUsername: string;
			ownerAvatarUrl: string | null;
		}): DashboardSetup => ({
			id: s.id,
			name: s.name,
			slug: s.slug,
			description: s.description,
			starsCount: s.starsCount,
			clonesCount: s.clonesCount,
			updatedAt: s.updatedAt,
			ownerUsername: s.ownerUsername,
			ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
			agents: dashboardAgentsMap[s.id] ?? []
		});

		let searchItems: DashboardSetup[] = [];
		let searchTotal = 0;
		let searchPage = page;
		let searchTotalPages = 1;

		if (searchActive) {
			const results = await searchSetups({
				q,
				agentSlugs: agents.length > 0 ? agents : undefined,
				tagName: tag,
				sort,
				page
			});
			const searchAgentsMap = await getAgentsForSetups(results.items.map((s) => s.id));
			searchItems = results.items.map(
				(s): DashboardSetup => ({
					id: s.id,
					name: s.name,
					slug: s.slug,
					description: s.description,
					starsCount: s.starsCount,
					clonesCount: s.clonesCount,
					updatedAt: s.updatedAt,
					ownerUsername: s.ownerUsername,
					ownerAvatarUrl: s.ownerAvatarUrl || undefined,
					agents: searchAgentsMap[s.id] ?? []
				})
			);
			searchTotal = results.total;
			searchPage = results.page;
			searchTotalPages = results.totalPages;
		}

		return {
			user: locals.user,
			featuredSetups: featured.map(toCard),
			trendingSetups: trending.map(toCard),
			recentSetups: recent.map(toCard),
			q,
			agents,
			tag,
			sort,
			page,
			searchActive,
			searchItems,
			searchTotal,
			searchPage,
			searchTotalPages,
			allAgents,
			allTags
		};
	}

	const results = await searchSetups({ sort: 'trending', page: 1 });
	const setupIds = results.items.slice(0, 6).map((s) => s.id);
	const agentsMap = await getAgentsForSetups(setupIds);

	return {
		user: null,
		featuredSetups: [] as DashboardSetup[],
		trendingSetups: results.items.slice(0, 6).map(
			(s): DashboardSetup => ({
				id: s.id,
				name: s.name,
				slug: s.slug,
				description: s.description,
				starsCount: s.starsCount,
				clonesCount: s.clonesCount,
				updatedAt: s.updatedAt,
				ownerUsername: s.ownerUsername,
				ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
				agents: agentsMap[s.id] ?? []
			})
		),
		recentSetups: [] as DashboardSetup[],
		q: undefined as string | undefined,
		agents: [] as string[],
		tag: undefined as string | undefined,
		sort: 'newest' as ExploreSort,
		page: 1,
		searchActive: false,
		searchItems: [] as DashboardSetup[],
		searchTotal: 0,
		searchPage: 1,
		searchTotalPages: 1,
		allAgents: [] as Awaited<ReturnType<typeof getAllAgentsWithSetupCount>>,
		allTags: [] as Awaited<ReturnType<typeof getAllTags>>
	};
};
