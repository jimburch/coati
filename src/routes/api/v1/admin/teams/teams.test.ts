import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAllTeams = vi.fn();

vi.mock('$lib/server/queries/admin', () => ({
	getAllTeamsWithAdminDetails: (...args: unknown[]) => mockGetAllTeams(...args)
}));

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

const MOCK_ADMIN = { id: 'admin-id', username: 'admin', isAdmin: true };
const MOCK_TEAMS = [
	{
		id: 'team-1',
		name: 'Acme Corp',
		slug: 'acme-corp',
		avatarUrl: null,
		ownerId: 'user-1',
		ownerUsername: 'alice',
		membersCount: 3,
		setupsCount: 5,
		createdAt: new Date('2026-01-01')
	},
	{
		id: 'team-2',
		name: 'Beta Team',
		slug: 'beta-team',
		avatarUrl: 'https://example.com/avatar.png',
		ownerId: 'user-2',
		ownerUsername: 'bob',
		membersCount: 1,
		setupsCount: 0,
		createdAt: new Date('2026-02-01')
	}
];

function makeGetEvent(searchParam?: string, user: unknown = MOCK_ADMIN) {
	const url = new URL(
		`http://localhost/api/v1/admin/teams${searchParam ? `?q=${searchParam}` : ''}`
	);
	return {
		locals: { user },
		url,
		request: new Request(url.toString())
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/admin/teams', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(MOCK_ADMIN as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent(undefined, undefined));
		expect(res.status).toBe(401);
	});

	it('returns 403 for non-admin user', async () => {
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(
			new Response(JSON.stringify({ error: 'Admin access required', code: 'FORBIDDEN' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent());
		expect(res.status).toBe(403);
	});

	it('returns all teams without search', async () => {
		mockGetAllTeams.mockResolvedValue(MOCK_TEAMS);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.teams).toHaveLength(2);
		expect(body.data.teams[0]).toMatchObject({
			id: 'team-1',
			name: 'Acme Corp',
			slug: 'acme-corp',
			ownerUsername: 'alice',
			membersCount: 3,
			setupsCount: 5
		});
		expect(mockGetAllTeams).toHaveBeenCalledWith(undefined);
	});

	it('passes search query to getAllTeamsWithAdminDetails', async () => {
		mockGetAllTeams.mockResolvedValue([MOCK_TEAMS[0]]);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('acme'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.teams).toHaveLength(1);
		expect(mockGetAllTeams).toHaveBeenCalledWith('acme');
	});

	it('returns empty array when no teams match search', async () => {
		mockGetAllTeams.mockResolvedValue([]);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nonexistent'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.teams).toHaveLength(0);
	});
});
