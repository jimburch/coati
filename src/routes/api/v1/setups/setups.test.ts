import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearchSetups = vi.fn();
const mockCreateSetup = vi.fn();
const mockGetTeamByIdForAuth = vi.fn();
const mockGetTeamMemberRole = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	searchSetups: (filters: unknown) => mockSearchSetups(filters),
	createSetup: (userId: unknown, data: unknown) => mockCreateSetup(userId, data)
}));

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		search: (filters: unknown) => mockSearchSetups(filters),
		create: (userId: unknown, data: unknown) => mockCreateSetup(userId, data)
	}
}));

vi.mock('$lib/server/queries/teams', () => ({
	getTeamByIdForAuth: (...args: unknown[]) => mockGetTeamByIdForAuth(...args),
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: () => ({ id: 'user-id', username: 'testuser', hasBetaFeatures: true })
}));

const MOCK_SEARCH_RESULT = {
	items: [
		{
			id: 'setup-uuid-1',
			name: 'My Setup',
			slug: 'my-setup',
			description: 'A great setup',
			starsCount: 10,
			clonesCount: 3,
			updatedAt: new Date('2026-01-01'),
			ownerUsername: 'alice',
			ownerAvatarUrl: 'https://example.com/avatar.png',
			agents: ['claude-code']
		}
	],
	total: 1,
	page: 1,
	pageSize: 12,
	totalPages: 1
};

function makeGetEvent(params: Record<string, string> = {}) {
	const searchParams = new URLSearchParams(params);
	return {
		url: { searchParams }
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/setups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with search results', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty('data');
		expect(body.data).toHaveProperty('items');
	});

	it('passes agent slug to searchSetups when ?agent= is provided', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		await GET(makeGetEvent({ agent: 'claude-code' }));
		expect(mockSearchSetups).toHaveBeenCalledWith(
			expect.objectContaining({ agentSlugs: ['claude-code'] })
		);
	});

	it('passes query string to searchSetups when ?q= is provided', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		await GET(makeGetEvent({ q: 'react' }));
		expect(mockSearchSetups).toHaveBeenCalledWith(expect.objectContaining({ q: 'react' }));
	});

	it('passes sort param to searchSetups', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		await GET(makeGetEvent({ sort: 'stars' }));
		expect(mockSearchSetups).toHaveBeenCalledWith(expect.objectContaining({ sort: 'stars' }));
	});

	it('defaults sort to newest when not provided', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		await GET(makeGetEvent());
		expect(mockSearchSetups).toHaveBeenCalledWith(expect.objectContaining({ sort: 'newest' }));
	});

	it('defaults page to 1 when not provided', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		await GET(makeGetEvent());
		expect(mockSearchSetups).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }));
	});

	it('setup items include agents array', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent());
		const body = await res.json();
		expect(body.data.items[0]).toHaveProperty('agents');
		expect(Array.isArray(body.data.items[0].agents)).toBe(true);
	});

	it('passes agentSlugs as undefined when no agent param', async () => {
		mockSearchSetups.mockResolvedValue(MOCK_SEARCH_RESULT);
		const { GET } = await import('./+server');
		await GET(makeGetEvent());
		expect(mockSearchSetups).toHaveBeenCalledWith(
			expect.objectContaining({ agentSlugs: undefined })
		);
	});
});

const MOCK_CREATED_SETUP = {
	id: 'setup-uuid-1',
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A great setup',
	userId: 'user-id',
	teamId: null,
	visibility: 'public',
	starsCount: 0,
	clonesCount: 0,
	commentsCount: 0,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01')
};

function makePostEvent(body: Record<string, unknown>) {
	return {
		request: new Request('http://localhost/api/v1/setups', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { user: { id: 'user-id', username: 'testuser', hasBetaFeatures: true } }
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/setups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates setup without teamId and returns 201', async () => {
		mockCreateSetup.mockResolvedValue(MOCK_CREATED_SETUP);
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({ name: 'My Setup', slug: 'my-setup', description: 'desc' })
		);
		expect(res.status).toBe(201);
	});

	it('returns 404 when teamId is provided but team not found', async () => {
		mockGetTeamByIdForAuth.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: '00000000-0000-4000-8000-000000000001'
			})
		);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns 403 when teamId is provided but user is not a member', async () => {
		mockGetTeamByIdForAuth.mockResolvedValue({
			id: 'team-1',
			name: 'My Team',
			slug: 'my-team',
			ownerId: 'owner-id'
		});
		mockGetTeamMemberRole.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: '00000000-0000-4000-8000-000000000001'
			})
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
	});

	it('creates team setup when user is a member', async () => {
		mockGetTeamByIdForAuth.mockResolvedValue({
			id: '00000000-0000-4000-8000-000000000001',
			name: 'My Team',
			slug: 'my-team',
			ownerId: 'owner-id'
		});
		mockGetTeamMemberRole.mockResolvedValue('member');
		mockCreateSetup.mockResolvedValue({
			...MOCK_CREATED_SETUP,
			teamId: '00000000-0000-4000-8000-000000000001',
			visibility: 'private'
		});
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: '00000000-0000-4000-8000-000000000001'
			})
		);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.teamId).toBe('00000000-0000-4000-8000-000000000001');
	});

	it('creates team setup when user is an admin', async () => {
		mockGetTeamByIdForAuth.mockResolvedValue({
			id: '00000000-0000-4000-8000-000000000001',
			name: 'My Team',
			slug: 'my-team',
			ownerId: 'owner-id'
		});
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockCreateSetup.mockResolvedValue({
			...MOCK_CREATED_SETUP,
			teamId: '00000000-0000-4000-8000-000000000001',
			visibility: 'private'
		});
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: '00000000-0000-4000-8000-000000000001'
			})
		);
		expect(res.status).toBe(201);
	});
});

// ── server refinement: forced-private when teamId is present ──────────────────

describe('POST /api/v1/setups — forced-private when teamId is present', () => {
	const TEAM_ID = '00000000-0000-4000-8000-000000000001';

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeamByIdForAuth.mockResolvedValue({
			id: TEAM_ID,
			name: 'My Team',
			slug: 'my-team',
			ownerId: 'owner-id'
		});
		mockGetTeamMemberRole.mockResolvedValue('member');
		mockCreateSetup.mockResolvedValue({
			...MOCK_CREATED_SETUP,
			teamId: TEAM_ID,
			visibility: 'private'
		});
	});

	it('stores as private when payload has teamId + visibility: public', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: TEAM_ID,
				visibility: 'public'
			})
		);
		expect(res.status).toBe(201);
		expect(mockCreateSetup).toHaveBeenCalledWith(
			'user-id',
			expect.objectContaining({ teamId: TEAM_ID, visibility: 'private' })
		);
	});

	it('stores as private when payload has teamId but no visibility field', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: TEAM_ID
			})
		);
		expect(res.status).toBe(201);
		expect(mockCreateSetup).toHaveBeenCalledWith(
			'user-id',
			expect.objectContaining({ teamId: TEAM_ID, visibility: 'private' })
		);
	});

	it('respects declared visibility when no teamId is present', async () => {
		mockCreateSetup.mockResolvedValue({ ...MOCK_CREATED_SETUP, visibility: 'public' });
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				visibility: 'public'
			})
		);
		expect(res.status).toBe(201);
		expect(mockCreateSetup).toHaveBeenCalledWith(
			'user-id',
			expect.objectContaining({ visibility: 'public' })
		);
		const payload = mockCreateSetup.mock.calls[0][1] as Record<string, unknown>;
		expect(payload).not.toHaveProperty('teamId');
	});

	it('stores as private when teamId + visibility: private (no override needed)', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				teamId: TEAM_ID,
				visibility: 'private'
			})
		);
		expect(res.status).toBe(201);
		expect(mockCreateSetup).toHaveBeenCalledWith(
			'user-id',
			expect.objectContaining({ teamId: TEAM_ID, visibility: 'private' })
		);
	});
});

describe('POST /api/v1/setups — rejects unsafe file paths', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 400 and does not persist when any file path escapes the setup root', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				files: [
					{ path: 'README.md', content: 'safe' },
					{ path: '../../.ssh/authorized_keys', content: 'pwn' }
				]
			})
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.error).toContain('../../.ssh/authorized_keys');
		expect(mockCreateSetup).not.toHaveBeenCalled();
	});

	it('returns 400 and does not persist for an absolute file path', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({
				name: 'My Setup',
				slug: 'my-setup',
				description: 'desc',
				files: [{ path: '/etc/passwd', content: 'pwn' }]
			})
		);
		expect(res.status).toBe(400);
		expect(mockCreateSetup).not.toHaveBeenCalled();
	});
});
