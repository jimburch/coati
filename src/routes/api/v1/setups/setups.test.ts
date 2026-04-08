import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSearchSetups = vi.fn();
const mockCreateSetup = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	searchSetups: (filters: unknown) => mockSearchSetups(filters),
	createSetup: (userId: unknown, data: unknown) => mockCreateSetup(userId, data)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: () => ({ id: 'user-id', username: 'testuser' })
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
