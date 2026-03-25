import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetAllAgentsWithSetupCount = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getAllAgentsWithSetupCount: () => mockGetAllAgentsWithSetupCount()
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_AGENTS = [
	{
		id: 'agent-uuid-1',
		slug: 'claude-code',
		displayName: 'Claude Code',
		icon: 'claude-code.svg',
		website: 'https://claude.ai',
		official: true,
		setupsCount: 5
	},
	{
		id: 'agent-uuid-2',
		slug: 'copilot',
		displayName: 'GitHub Copilot',
		icon: 'copilot.svg',
		website: 'https://github.com/features/copilot',
		official: true,
		setupsCount: 2
	}
];

describe('GET /api/v1/agents', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with data array', async () => {
		mockGetAllAgentsWithSetupCount.mockResolvedValue(MOCK_AGENTS);
		const { GET } = await import('./+server');
		const res = await GET({} as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty('data');
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('returns all agents with correct fields', async () => {
		mockGetAllAgentsWithSetupCount.mockResolvedValue(MOCK_AGENTS);
		const { GET } = await import('./+server');
		const res = await GET({} as Parameters<typeof GET>[0]);
		const body = await res.json();
		expect(body.data).toHaveLength(2);
		const agent = body.data[0];
		expect(agent).toHaveProperty('slug', 'claude-code');
		expect(agent).toHaveProperty('displayName', 'Claude Code');
		expect(agent).toHaveProperty('icon');
		expect(agent).toHaveProperty('website');
		expect(agent).toHaveProperty('official', true);
		expect(agent).toHaveProperty('setupsCount', 5);
	});

	it('returns empty array when no agents exist', async () => {
		mockGetAllAgentsWithSetupCount.mockResolvedValue([]);
		const { GET } = await import('./+server');
		const res = await GET({} as Parameters<typeof GET>[0]);
		const body = await res.json();
		expect(body.data).toHaveLength(0);
	});

	it('returns Content-Type application/json', async () => {
		mockGetAllAgentsWithSetupCount.mockResolvedValue(MOCK_AGENTS);
		const { GET } = await import('./+server');
		const res = await GET({} as Parameters<typeof GET>[0]);
		expect(res.headers.get('Content-Type')).toBe('application/json');
	});
});
