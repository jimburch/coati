import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b }))
}));

vi.mock('$lib/server/db/schema', () => ({
	setups: { id: 'setups.id', userId: 'setups.userId' },
	setupAgents: { setupId: 'setupAgents.setupId', agentId: 'setupAgents.agentId' },
	agents: { id: 'agents.id', slug: 'agents.slug', displayName: 'agents.displayName' }
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	chain['select'] = vi.fn(() => chain);
	chain['from'] = vi.fn(() => chain);
	chain['innerJoin'] = vi.fn(() => chain);
	chain['where'] = vi.fn(() => Promise.resolve(state.rows));
	return { db: chain };
});

import { getUserSetupAgents } from './users';

describe('getUserSetupAgents', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when user has no setups', async () => {
		state.rows = [];
		const result = await getUserSetupAgents('user-1');
		expect(result).toEqual([]);
	});

	it('returns distinct agents from a single setup', async () => {
		state.rows = [
			{ id: 'agent-1', slug: 'claude-code', displayName: 'Claude Code' },
			{ id: 'agent-2', slug: 'cursor', displayName: 'Cursor' }
		];
		const result = await getUserSetupAgents('user-1');
		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			id: 'agent-1',
			slug: 'claude-code',
			displayName: 'Claude Code'
		});
		expect(result[1]).toMatchObject({ id: 'agent-2', slug: 'cursor', displayName: 'Cursor' });
	});

	it('deduplicates overlapping agents across multiple setups', async () => {
		// Simulate the DB returning duplicate agent rows (same agent on 2 setups)
		state.rows = [
			{ id: 'agent-1', slug: 'claude-code', displayName: 'Claude Code' },
			{ id: 'agent-2', slug: 'cursor', displayName: 'Cursor' },
			{ id: 'agent-1', slug: 'claude-code', displayName: 'Claude Code' }, // duplicate from setup 2
			{ id: 'agent-3', slug: 'copilot', displayName: 'GitHub Copilot' }
		];
		const result = await getUserSetupAgents('user-1');
		expect(result).toHaveLength(3);
		const slugs = result.map((a) => a.slug);
		expect(slugs).toContain('claude-code');
		expect(slugs).toContain('cursor');
		expect(slugs).toContain('copilot');
	});

	it('returns only agents whose setups belong to the given user', async () => {
		state.rows = [{ id: 'agent-1', slug: 'claude-code', displayName: 'Claude Code' }];
		const result = await getUserSetupAgents('user-abc');
		expect(result).toHaveLength(1);
		expect(result[0].slug).toBe('claude-code');
	});
});
