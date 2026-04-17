import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamBySlug = vi.fn();
const mockGetTeamBySlugForAuth = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamBySlug: (...args: unknown[]) => mockGetTeamBySlug(...args),
	getTeamBySlugForAuth: (...args: unknown[]) => mockGetTeamBySlugForAuth(...args),
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args),
	updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
	deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

const MOCK_TEAM = {
	id: 'team-1',
	name: 'My Team',
	slug: 'my-team',
	description: 'A team',
	avatarUrl: null,
	ownerId: 'owner-id',
	membersCount: 1,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	setups: []
};

function makeGetEvent(slug: string, userId?: string) {
	return {
		params: { slug },
		locals: { user: userId ? { id: userId } : null },
		request: new Request(`http://localhost/api/v1/teams/${slug}`)
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/teams/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with team when found', async () => {
		mockGetTeamBySlug.mockResolvedValue(MOCK_TEAM);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-team'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.slug).toBe('my-team');
	});

	it('returns 404 when team not found', async () => {
		mockGetTeamBySlug.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nonexistent'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('passes viewerId when authenticated', async () => {
		mockGetTeamBySlug.mockResolvedValue(MOCK_TEAM);
		const { GET } = await import('./+server');
		await GET(makeGetEvent('my-team', 'user-1'));
		expect(mockGetTeamBySlug).toHaveBeenCalledWith('my-team', 'user-1');
	});

	it('passes undefined viewerId when not authenticated', async () => {
		mockGetTeamBySlug.mockResolvedValue(MOCK_TEAM);
		const { GET } = await import('./+server');
		await GET(makeGetEvent('my-team'));
		expect(mockGetTeamBySlug).toHaveBeenCalledWith('my-team', undefined);
	});
});
