import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearchUsers = vi.fn();
const mockSetupRepoSearch = vi.fn();

vi.mock('$lib/server/queries/users', () => ({
	searchUsers: (q: string, limit: number) => mockSearchUsers(q, limit)
}));

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		search: (filters: unknown) => mockSetupRepoSearch(filters)
	}
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_USERS = [
	{
		id: 'u1',
		username: 'alice',
		name: 'Alice',
		avatarUrl: 'https://example.com/a.png',
		setupsCount: 2
	},
	{
		id: 'u2',
		username: 'alan',
		name: 'Alan',
		avatarUrl: 'https://example.com/b.png',
		setupsCount: 0
	}
];

const MOCK_SETUPS_RESULT = {
	items: [
		{
			id: 's1',
			name: 'Setup 1',
			slug: 'setup-1',
			ownerUsername: 'alice',
			starsCount: 5,
			agents: []
		},
		{ id: 's2', name: 'Setup 2', slug: 'setup-2', ownerUsername: 'bob', starsCount: 3, agents: [] }
	],
	total: 2,
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

describe('GET /api/v1/search', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with users and setups', async () => {
		mockSearchUsers.mockResolvedValue(MOCK_USERS);
		mockSetupRepoSearch.mockResolvedValue(MOCK_SETUPS_RESULT);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent({ q: 'al' }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveProperty('users');
		expect(body.data).toHaveProperty('setups');
	});

	it('returns 400 when query is too short', async () => {
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent({ q: 'a' }));
		expect(res.status).toBe(400);
	});

	it('returns 400 when query is missing', async () => {
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent());
		expect(res.status).toBe(400);
	});

	it('caps users at 3', async () => {
		mockSearchUsers.mockResolvedValue(MOCK_USERS);
		mockSetupRepoSearch.mockResolvedValue(MOCK_SETUPS_RESULT);

		const { GET } = await import('./+server');
		await GET(makeGetEvent({ q: 'al' }));
		expect(mockSearchUsers).toHaveBeenCalledWith('al', 3);
	});

	it('caps setups at 5', async () => {
		const manySetups = Array.from({ length: 10 }, (_, i) => ({
			id: `s${i}`,
			name: `Setup ${i}`,
			slug: `setup-${i}`,
			ownerUsername: 'alice',
			starsCount: 0,
			agents: []
		}));
		mockSearchUsers.mockResolvedValue([]);
		mockSetupRepoSearch.mockResolvedValue({ ...MOCK_SETUPS_RESULT, items: manySetups });

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent({ q: 'al' }));
		const body = await res.json();
		expect(body.data.setups).toHaveLength(5);
	});

	it('passes query to searchUsers', async () => {
		mockSearchUsers.mockResolvedValue([]);
		mockSetupRepoSearch.mockResolvedValue(MOCK_SETUPS_RESULT);

		const { GET } = await import('./+server');
		await GET(makeGetEvent({ q: 'alice' }));
		expect(mockSearchUsers).toHaveBeenCalledWith('alice', 3);
	});

	it('passes query to setupRepo.search', async () => {
		mockSearchUsers.mockResolvedValue([]);
		mockSetupRepoSearch.mockResolvedValue(MOCK_SETUPS_RESULT);

		const { GET } = await import('./+server');
		await GET(makeGetEvent({ q: 'react' }));
		expect(mockSetupRepoSearch).toHaveBeenCalledWith(expect.objectContaining({ q: 'react' }));
	});

	it('trims whitespace from query', async () => {
		mockSearchUsers.mockResolvedValue([]);
		mockSetupRepoSearch.mockResolvedValue(MOCK_SETUPS_RESULT);

		const { GET } = await import('./+server');
		await GET(makeGetEvent({ q: '  al  ' }));
		expect(mockSearchUsers).toHaveBeenCalledWith('al', 3);
	});
});
