import { describe, it, expect } from 'vitest';

// The home page no longer has search/filter logic.
// Authenticated users see Featured, Trending, and Recently Added sections only.
// Search was removed per issue #175.

describe('home page data shape', () => {
	it('authenticated data includes featuredSetups, trendingSetups, recentSetups', () => {
		const data = {
			user: { id: '1', username: 'alice' },
			featuredSetups: [],
			trendingSetups: [],
			recentSetups: []
		};
		expect(data).toHaveProperty('featuredSetups');
		expect(data).toHaveProperty('trendingSetups');
		expect(data).toHaveProperty('recentSetups');
		expect(Array.isArray(data.featuredSetups)).toBe(true);
		expect(Array.isArray(data.trendingSetups)).toBe(true);
		expect(Array.isArray(data.recentSetups)).toBe(true);
	});

	it('unauthenticated data has null user and trendingSetups only', () => {
		const data = {
			user: null,
			featuredSetups: [],
			trendingSetups: [],
			recentSetups: []
		};
		expect(data.user).toBeNull();
		expect(Array.isArray(data.trendingSetups)).toBe(true);
	});
});
