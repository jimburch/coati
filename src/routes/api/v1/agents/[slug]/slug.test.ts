import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAgentBySlugWithSetups = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getAgentBySlugWithSetups: (slug: string) => mockGetAgentBySlugWithSetups(slug)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_AGENT = {
	id: 'agent-uuid-1',
	slug: 'claude-code',
	displayName: 'Claude Code',
	icon: 'claude-code.svg',
	website: 'https://claude.ai',
	official: true,
	setupsCount: 2,
	setups: [
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
	]
};

function makeEvent(slug: string) {
	return { params: { slug } } as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/agents/:slug', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with agent data when slug exists', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(MOCK_AGENT);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('claude-code'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty('data');
		expect(body.data.slug).toBe('claude-code');
	});

	it('returns agent with correct fields', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(MOCK_AGENT);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('claude-code'));
		const body = await res.json();
		expect(body.data).toHaveProperty('slug', 'claude-code');
		expect(body.data).toHaveProperty('displayName', 'Claude Code');
		expect(body.data).toHaveProperty('icon');
		expect(body.data).toHaveProperty('website');
		expect(body.data).toHaveProperty('official', true);
		expect(body.data).toHaveProperty('setupsCount', 2);
	});

	it('returns agent with setups array', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(MOCK_AGENT);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('claude-code'));
		const body = await res.json();
		expect(Array.isArray(body.data.setups)).toBe(true);
		expect(body.data.setups).toHaveLength(1);
		expect(body.data.setups[0]).toHaveProperty('slug', 'my-setup');
		expect(body.data.setups[0]).toHaveProperty('agents');
		expect(body.data.setups[0].agents).toContain('claude-code');
	});

	it('returns 404 for unknown slug', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('unknown-agent'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('passes slug param to query function', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(MOCK_AGENT);
		const { GET } = await import('./+server');
		await GET(makeEvent('cursor'));
		expect(mockGetAgentBySlugWithSetups).toHaveBeenCalledWith('cursor');
	});

	it('returns Content-Type application/json', async () => {
		mockGetAgentBySlugWithSetups.mockResolvedValue(MOCK_AGENT);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('claude-code'));
		expect(res.headers.get('Content-Type')).toBe('application/json');
	});
});
