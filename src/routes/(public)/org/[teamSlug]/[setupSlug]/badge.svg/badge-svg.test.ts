import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamBadgeState = vi.fn();
const mockGetBadge = vi.fn();
const mockSetBadge = vi.fn();

vi.mock('$lib/server/queries/badgeState', () => ({
	getTeamBadgeState: (...args: unknown[]) => mockGetTeamBadgeState(...args)
}));

vi.mock('$lib/server/badge-cache', () => ({
	getBadge: (...args: unknown[]) => mockGetBadge(...args),
	setBadge: (...args: unknown[]) => mockSetBadge(...args)
}));

vi.mock('$lib/server/badge', () => ({
	BADGE_AVAILABLE: '<svg>available</svg>',
	BADGE_UNAVAILABLE: '<svg>unavailable</svg>'
}));

function makeGetEvent(teamSlug: string, setupSlug: string) {
	return {
		params: { teamSlug, setupSlug },
		request: new Request(`http://localhost/org/${teamSlug}/${setupSlug}/badge.svg`)
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /org/:teamSlug/:setupSlug/badge.svg', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with image/svg+xml content-type', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-org', 'my-setup'));
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8');
	});

	it('returns BADGE_AVAILABLE body when team setup is public', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-org', 'my-setup'));
		expect(await res.text()).toBe('<svg>available</svg>');
	});

	it('returns BADGE_UNAVAILABLE body when team setup is private', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-org', 'private-setup'));
		expect(await res.text()).toBe('<svg>unavailable</svg>');
	});

	it('returns BADGE_UNAVAILABLE body when team setup does not exist', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nobody', 'nothing'));
		expect(await res.text()).toBe('<svg>unavailable</svg>');
	});

	it('includes the correct Cache-Control header', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-org', 'my-setup'));
		expect(res.headers.get('Cache-Control')).toBe(
			'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
		);
	});

	it('returns 200 (not 4xx) even when team setup is unavailable', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nobody', 'ghost'));
		expect(res.status).toBe(200);
	});

	it('serves the cached SVG without calling getTeamBadgeState on a cache hit', async () => {
		mockGetBadge.mockReturnValue('<svg>cached</svg>');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-org', 'my-setup'));
		expect(await res.text()).toBe('<svg>cached</svg>');
		expect(mockGetTeamBadgeState).not.toHaveBeenCalled();
	});

	it('caches the resolved SVG on a cache miss', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('available');
		const { GET } = await import('./+server');
		await GET(makeGetEvent('my-org', 'my-setup'));
		expect(mockSetBadge).toHaveBeenCalledWith('team:my-org/my-setup', '<svg>available</svg>');
	});

	it('uses team:teamSlug/setupSlug as the cache key', async () => {
		mockGetBadge.mockReturnValue(undefined);
		mockGetTeamBadgeState.mockResolvedValue('unavailable');
		const { GET } = await import('./+server');
		await GET(makeGetEvent('cool-org', 'cool-setup'));
		expect(mockGetBadge).toHaveBeenCalledWith('team:cool-org/cool-setup');
		expect(mockSetBadge).toHaveBeenCalledWith('team:cool-org/cool-setup', '<svg>unavailable</svg>');
	});
});
