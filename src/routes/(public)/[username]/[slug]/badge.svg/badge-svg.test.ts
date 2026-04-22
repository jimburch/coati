import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetBadgeState = vi.fn();
const mockGetBadge = vi.fn();
const mockSetBadge = vi.fn();

vi.mock('$lib/server/queries/badgeState', () => ({
	getBadgeState: (...args: unknown[]) => mockGetBadgeState(...args)
}));

vi.mock('$lib/server/badge-cache', () => ({
	getBadge: (...args: unknown[]) => mockGetBadge(...args),
	setBadge: (...args: unknown[]) => mockSetBadge(...args)
}));

vi.mock('$lib/server/badge', () => ({
	BADGE_AVAILABLE: '<svg>available</svg>',
	BADGE_UNAVAILABLE: '<svg>unavailable</svg>'
}));

function makeGetEvent(username: string, slug: string) {
	return {
		params: { username, slug },
		request: new Request(`http://localhost/${username}/${slug}/badge.svg`)
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /:username/:slug/badge.svg', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with image/svg+xml content-type', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8');
	});

	it('returns BADGE_AVAILABLE body when setup is public', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		expect(await res.text()).toBe('<svg>available</svg>');
	});

	it('returns BADGE_UNAVAILABLE body when setup is private', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'private-setup'));
		expect(await res.text()).toBe('<svg>unavailable</svg>');
	});

	it('returns BADGE_UNAVAILABLE body when setup does not exist', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nobody', 'nothing'));
		expect(await res.text()).toBe('<svg>unavailable</svg>');
	});

	it('includes the correct Cache-Control header', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		expect(res.headers.get('Cache-Control')).toBe(
			'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
		);
	});

	it('returns 200 (not 4xx) even when setup is unavailable', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nobody', 'ghost'));
		expect(res.status).toBe(200);
	});

	it('serves the cached SVG without calling getBadgeState on a cache hit', async () => {
		mockGetBadge.mockReturnValue('<svg>cached</svg>');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		expect(await res.text()).toBe('<svg>cached</svg>');
		expect(mockGetBadgeState).not.toHaveBeenCalled();
	});

	it('caches the resolved SVG on a cache miss', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		await GET(makeGetEvent('alice', 'my-setup'));
		expect(mockSetBadge).toHaveBeenCalledWith('alice/my-setup', '<svg>available</svg>');
	});

	it('uses username/slug as the cache key', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		await GET(makeGetEvent('bob', 'cool-setup'));
		expect(mockGetBadge).toHaveBeenCalledWith('bob/cool-setup');
		expect(mockSetBadge).toHaveBeenCalledWith('bob/cool-setup', '<svg>unavailable</svg>');
	});
});
