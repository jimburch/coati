import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spy on the query functions to verify they are called with correct limits
const mockGetFeaturedSetups = vi.hoisted(() => vi.fn());
const mockGetRecentSetups = vi.hoisted(() => vi.fn());
const mockGetAgentsForSetups = vi.hoisted(() => vi.fn());
const mockGetUserAggregateStats = vi.hoisted(() => vi.fn());
const mockGetUserSetups = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/queries/setups', () => ({
	getFeaturedSetups: mockGetFeaturedSetups,
	getRecentSetups: mockGetRecentSetups,
	getAgentsForSetups: mockGetAgentsForSetups,
	getTrendingSetups: vi.fn(),
	searchSetups: vi.fn()
}));

vi.mock('$lib/server/queries/users', () => ({
	getUserAggregateStats: mockGetUserAggregateStats,
	getUserSetups: mockGetUserSetups
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
		mockGetRecentSetups.mockResolvedValue([]);
		mockGetAgentsForSetups.mockResolvedValue({});
		mockGetUserAggregateStats.mockResolvedValue({
			setupsCount: 0,
			starsReceived: 0,
			clonesTotal: 0,
			followingCount: 0
		});
		mockGetUserSetups.mockResolvedValue([]);
	});

	it('fetches featured setups with limit 3', async () => {
		const { load } = await import('./+page.server');
		mockGetFeaturedSetups.mockResolvedValue(makeSetups(3));

		await load({ locals: { user: { id: 'u1' } } } as never);

		expect(mockGetFeaturedSetups).toHaveBeenCalledWith(3, 'u1');
	});

	it('fetches recent setups with limit 3', async () => {
		const { load } = await import('./+page.server');
		mockGetRecentSetups.mockResolvedValue(makeSetups(3));

		await load({ locals: { user: { id: 'u1' } } } as never);

		expect(mockGetRecentSetups).toHaveBeenCalledWith(3, 'u1');
	});

	it('does not return trendingSetups in authenticated response', async () => {
		const { load } = await import('./+page.server');

		const result = await load({ locals: { user: { id: 'u1' } } } as never);

		expect(result).not.toHaveProperty('trendingSetups');
	});

	it('maps featured setups with ownerAvatarUrl undefined when null', async () => {
		const { load } = await import('./+page.server');
		mockGetFeaturedSetups.mockResolvedValue([makeSetup('x')]);

		const result = (await load({
			locals: { user: { id: 'u1' } }
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
			locals: { user: { id: 'u1' } }
		} as never)) as Record<string, unknown>;

		const featured = result.featuredSetups as {
			agents: { id: string; displayName: string; slug: string }[];
		}[];
		expect(featured[0].agents).toEqual([{ id: 'a1', displayName: 'Claude', slug: 'claude-code' }]);
	});

	it('returns featured and recent setups in authenticated response', async () => {
		const { load } = await import('./+page.server');
		mockGetFeaturedSetups.mockResolvedValue(makeSetups(3));
		mockGetRecentSetups.mockResolvedValue(makeSetups(3));

		const result = (await load({
			locals: { user: { id: 'u1' } }
		} as never)) as Record<string, unknown>;

		expect((result.featuredSetups as unknown[]).length).toBe(3);
		expect((result.recentSetups as unknown[]).length).toBe(3);
	});
});
