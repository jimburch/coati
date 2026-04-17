import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamSetupDetail = vi.fn();

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getTeamSetupDetail: (...args: unknown[]) => mockGetTeamSetupDetail(...args)
	}
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_TEAM_SETUP = {
	id: 'setup-1',
	userId: 'user-1',
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A team setup',
	display: null,
	readme: null,
	category: null,
	license: null,
	minToolVersion: null,
	postInstall: null,
	prerequisites: null,
	visibility: 'private',
	teamId: 'team-1',
	starsCount: 0,
	clonesCount: 0,
	commentsCount: 0,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	featuredAt: null,
	ownerUsername: 'alice',
	ownerAvatarUrl: null,
	teamName: 'My Team',
	teamSlug: 'my-team',
	teamAvatarUrl: null,
	files: [],
	tags: [],
	agents: [],
	isStarred: false
};

function makeGetEvent(slug: string, setupSlug: string, userId?: string) {
	return {
		params: { slug, setupSlug },
		locals: { user: userId ? { id: userId } : null }
	} as Parameters<(typeof import('./[setupSlug]/+server'))['GET']>[0];
}

describe('GET /api/v1/teams/[slug]/setups/[setupSlug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with team setup when found and accessible', async () => {
		mockGetTeamSetupDetail.mockResolvedValue(MOCK_TEAM_SETUP);
		const { GET } = await import('./[setupSlug]/+server');
		const res = await GET(makeGetEvent('my-team', 'my-setup', 'user-1'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.slug).toBe('my-setup');
		expect(body.data.teamName).toBe('My Team');
	});

	it('returns 404 when setup not found', async () => {
		mockGetTeamSetupDetail.mockResolvedValue(null);
		const { GET } = await import('./[setupSlug]/+server');
		const res = await GET(makeGetEvent('my-team', 'nonexistent'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('passes teamSlug and setupSlug to getTeamSetupDetail', async () => {
		mockGetTeamSetupDetail.mockResolvedValue(MOCK_TEAM_SETUP);
		const { GET } = await import('./[setupSlug]/+server');
		await GET(makeGetEvent('my-team', 'my-setup', 'user-1'));
		expect(mockGetTeamSetupDetail).toHaveBeenCalledWith('my-team', 'my-setup', 'user-1');
	});

	it('passes undefined viewerId when not authenticated', async () => {
		mockGetTeamSetupDetail.mockResolvedValue(null);
		const { GET } = await import('./[setupSlug]/+server');
		await GET(makeGetEvent('my-team', 'my-setup'));
		expect(mockGetTeamSetupDetail).toHaveBeenCalledWith('my-team', 'my-setup', undefined);
	});
});
