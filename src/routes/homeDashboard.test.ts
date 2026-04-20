import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy on the query functions to verify they are called with correct limits
const mockGetFeaturedSetups = vi.hoisted(() => vi.fn());
const mockGetAgentsForSetups = vi.hoisted(() => vi.fn());
const mockGetTrendingSetups = vi.hoisted(() => vi.fn());
const mockGetUserAggregateStats = vi.hoisted(() => vi.fn());
const mockGetUserSetups = vi.hoisted(() => vi.fn());
const mockGetUserSetupAgents = vi.hoisted(() => vi.fn());
const mockGetBlendedActivityFeed = vi.hoisted(() => vi.fn());
const mockGetForYouSetups = vi.hoisted(() => vi.fn());
const mockGetSetupsFromFollowedUsers = vi.hoisted(() => vi.fn());
const mockGetUserTeams = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/queries/setups', () => ({
	getFeaturedSetups: mockGetFeaturedSetups,
	getAgentsForSetups: mockGetAgentsForSetups,
	getTrendingSetups: mockGetTrendingSetups,
	getForYouSetups: mockGetForYouSetups,
	getSetupsFromFollowedUsers: mockGetSetupsFromFollowedUsers,
	searchSetups: vi.fn()
}));

vi.mock('$lib/server/queries/users', () => ({
	getUserAggregateStats: mockGetUserAggregateStats,
	getUserSetups: mockGetUserSetups,
	getUserSetupAgents: mockGetUserSetupAgents
}));

vi.mock('$lib/server/queries/activityFeed', () => ({
	getBlendedActivityFeed: mockGetBlendedActivityFeed
}));

vi.mock('$lib/server/queries/teams', () => ({
	getUserTeams: mockGetUserTeams
}));

const makeSetup = (id: string) => ({
	id,
	name: `setup-${id}`,
	slug: `slug-${id}`,
	description: `desc-${id}`,
	display: null,
	starsCount: 0,
	clonesCount: 0,
	updatedAt: new Date('2026-01-01'),
	ownerUsername: 'alice',
	ownerAvatarUrl: null,
	agents: []
});

const makeSetups = (count: number) => Array.from({ length: count }, (_, i) => makeSetup(String(i)));

describe('home dashboard server load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetFeaturedSetups.mockResolvedValue([]);
		mockGetAgentsForSetups.mockResolvedValue({});
		mockGetTrendingSetups.mockResolvedValue([]);
		mockGetUserAggregateStats.mockResolvedValue({
			setupsCount: 0,
			starsReceived: 0,
			clonesTotal: 0,
			followersCount: 0
		});
		mockGetUserSetups.mockResolvedValue([]);
		mockGetUserSetupAgents.mockResolvedValue([]);
		mockGetBlendedActivityFeed.mockResolvedValue({ items: [], nextCursor: null });
		mockGetForYouSetups.mockResolvedValue([]);
		mockGetSetupsFromFollowedUsers.mockResolvedValue([]);
		mockGetUserTeams.mockResolvedValue([]);
	});

	it('fetches featured setups with limit 3', async () => {
		const { load } = await import('./+page.server');
		mockGetFeaturedSetups.mockResolvedValue(makeSetups(3));

		await load({ locals: { user: { id: 'u1' } }, url: new URL('http://localhost/') } as never);

		expect(mockGetFeaturedSetups).toHaveBeenCalledWith(3, 'u1');
	});

	it('fetches trending setups with limit 6 for DiscoveryTabs', async () => {
		const { load } = await import('./+page.server');

		await load({ locals: { user: { id: 'u1' } }, url: new URL('http://localhost/') } as never);

		expect(mockGetTrendingSetups).toHaveBeenCalledWith(6, 'u1');
	});

	it('returns trendingSetups in authenticated response', async () => {
		const { load } = await import('./+page.server');
		mockGetTrendingSetups.mockResolvedValue([
			{
				...makeSetup('t1'),
				ownerAvatarUrl: 'https://example.com/avatar.png',
				agents: ['claude-code']
			}
		]);

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/')
		} as never)) as Record<string, unknown>;

		expect(Array.isArray(result.trendingSetups)).toBe(true);
		expect((result.trendingSetups as unknown[]).length).toBe(1);
	});

	it('defaults activeTab to for-you when no tab param', async () => {
		const { load } = await import('./+page.server');

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/')
		} as never)) as Record<string, unknown>;

		expect(result.activeTab).toBe('for-you');
	});

	it('sets activeTab to trending when ?tab=trending', async () => {
		const { load } = await import('./+page.server');

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/?tab=trending')
		} as never)) as Record<string, unknown>;

		expect(result.activeTab).toBe('trending');
	});

	it('falls back to for-you for invalid tab values', async () => {
		const { load } = await import('./+page.server');

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/?tab=invalid')
		} as never)) as Record<string, unknown>;

		expect(result.activeTab).toBe('for-you');
	});

	it('maps featured setups with ownerAvatarUrl undefined when null', async () => {
		const { load } = await import('./+page.server');
		mockGetFeaturedSetups.mockResolvedValue([makeSetup('x')]);

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/')
		} as never)) as Record<string, unknown>;

		const featured = result.featuredSetups as { ownerAvatarUrl: unknown }[];
		expect(featured[0].ownerAvatarUrl).toBeUndefined();
	});

	it('maps featured setups with agents from agentsMap', async () => {
		const { load } = await import('./+page.server');
		const setup = makeSetup('s1');
		mockGetFeaturedSetups.mockResolvedValue([setup]);
		mockGetAgentsForSetups.mockResolvedValue({
			s1: [{ id: 'a1', displayName: 'Claude', slug: 'claude-code' }]
		});

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/')
		} as never)) as Record<string, unknown>;

		const featured = result.featuredSetups as {
			agents: { id: string; displayName: string; slug: string }[];
		}[];
		expect(featured[0].agents).toEqual([{ id: 'a1', displayName: 'Claude', slug: 'claude-code' }]);
	});

	it('returns featured setups in authenticated response', async () => {
		const { load } = await import('./+page.server');
		mockGetFeaturedSetups.mockResolvedValue(makeSetups(3));

		const result = (await load({
			locals: { user: { id: 'u1' } },
			url: new URL('http://localhost/')
		} as never)) as Record<string, unknown>;

		expect((result.featuredSetups as unknown[]).length).toBe(3);
	});
});
