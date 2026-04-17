import type { PageServerLoad } from './$types';
import {
	getFeaturedSetups,
	getRecentSetups,
	getAgentsForSetups,
	searchSetups
} from '$lib/server/queries/setups';
import { getUserAggregateStats, getUserSetups } from '$lib/server/queries/users';

type DashboardSetup = {
	id: string;
	name: string;
	slug: string;
	description: string;
	display?: string | null;
	starsCount: number;
	clonesCount: number;
	updatedAt: Date;
	ownerUsername: string;
	ownerAvatarUrl: string | undefined;
	agents: { id: string; displayName: string; slug: string }[];
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		const viewerId = locals.user.id;
		const [featured, recent, userStats, userSetups] = await Promise.all([
			getFeaturedSetups(3, viewerId),
			getRecentSetups(3, viewerId),
			getUserAggregateStats(viewerId),
			getUserSetups(viewerId, 5)
		]);

		const dashboardIds = [...featured.map((s) => s.id), ...recent.map((s) => s.id)];
		const dashboardAgentsMap =
			dashboardIds.length > 0 ? await getAgentsForSetups(dashboardIds) : {};

		const toCard = (s: {
			id: string;
			name: string;
			slug: string;
			description: string;
			display?: string | null;
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
			display: s.display,
			starsCount: s.starsCount,
			clonesCount: s.clonesCount,
			updatedAt: s.updatedAt,
			ownerUsername: s.ownerUsername,
			ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
			agents: dashboardAgentsMap[s.id] ?? []
		});

		return {
			user: locals.user,
			featuredSetups: featured.map(toCard),
			recentSetups: recent.map(toCard),
			userStats,
			userSetups
		};
	}

	const results = await searchSetups({ sort: 'trending', page: 1, viewerId: undefined });
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
				display: s.display,
				starsCount: s.starsCount,
				clonesCount: s.clonesCount,
				updatedAt: s.updatedAt,
				ownerUsername: s.ownerUsername,
				ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
				agents: agentsMap[s.id] ?? []
			})
		),
		recentSetups: [] as DashboardSetup[],
		userStats: null,
		userSetups: [] as {
			id: string;
			name: string;
			slug: string;
			description: string;
			display: string | null | undefined;
			visibility: 'public' | 'private';
			starsCount: number;
			clonesCount: number;
			updatedAt: Date;
		}[]
	};
};
