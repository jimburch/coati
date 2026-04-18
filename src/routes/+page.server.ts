import type { PageServerLoad } from './$types';
import {
	getFeaturedSetups,
	getAgentsForSetups,
	getTrendingSetups,
	getForYouSetups,
	getSetupsFromFollowedUsers,
	searchSetups
} from '$lib/server/queries/setups';
import {
	getUserAggregateStats,
	getUserSetups,
	getUserSetupAgents
} from '$lib/server/queries/users';
import { getUserTeams } from '$lib/server/queries/teams';
import { getActivityOnUserSetups, type SetupActivityEntry } from '$lib/server/queries/activities';

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

const VALID_TABS = ['for-you', 'following', 'trending'] as const;
type Tab = (typeof VALID_TABS)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const viewerId = locals.user.id;
		const rawTab = url.searchParams.get('tab');
		const activeTab: Tab = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
			? (rawTab as Tab)
			: 'for-you';

		const [
			featured,
			userStats,
			userSetups,
			userAgents,
			userTeams,
			trending,
			yourActivity,
			forYou,
			following
		] = await Promise.all([
			getFeaturedSetups(3, viewerId),
			getUserAggregateStats(viewerId),
			getUserSetups(viewerId, 5),
			getUserSetupAgents(viewerId),
			getUserTeams(viewerId),
			getTrendingSetups(6, viewerId),
			getActivityOnUserSetups(viewerId),
			getForYouSetups(viewerId, 6),
			getSetupsFromFollowedUsers(viewerId, 6)
		]);

		const featuredIds = featured.map((s) => s.id);
		const dashboardAgentsMap = featuredIds.length > 0 ? await getAgentsForSetups(featuredIds) : {};

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
			yourActivity,
			trendingSetups: trending.map(
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
					agents: []
				})
			),
			forYouSetups: forYou.map(
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
					ownerAvatarUrl: s.ownerAvatarUrl || undefined,
					agents: s.agents
				})
			),
			followingSetups: following.map(
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
					ownerAvatarUrl: s.ownerAvatarUrl || undefined,
					agents: s.agents
				})
			),
			activeTab,
			userStats,
			userSetups,
			userAgents,
			userTeams: userTeams.map((t) => ({
				id: t.id,
				name: t.name,
				slug: t.slug,
				avatarUrl: t.avatarUrl
			}))
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
		forYouSetups: [] as DashboardSetup[],
		followingSetups: [] as DashboardSetup[],
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
		}[],
		userAgents: [] as { id: string; slug: string; displayName: string }[],
		userTeams: [] as { id: string; name: string; slug: string; avatarUrl: string | null }[],
		yourActivity: [] as SetupActivityEntry[]
	};
};
