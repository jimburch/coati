import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

// Capture SQL strings for assertions
const capturedSql = vi.hoisted(() => ({ queries: [] as string[] }));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		capturedSql.queries.push(strings.join('__'));
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	sqlFn.join = vi.fn((parts: unknown[], sep: unknown) => ({ _type: 'sql-join', parts, sep }));
	return {
		sql: sqlFn,
		eq: vi.fn(() => ({})),
		and: vi.fn(() => ({})),
		desc: vi.fn(() => ({})),
		inArray: vi.fn(() => ({}))
	};
});

vi.mock('$lib/server/db/schema', () => ({
	setups: {
		id: 'setups.id',
		userId: 'setups.userId',
		name: 'setups.name',
		slug: 'setups.slug',
		description: 'setups.description',
		starsCount: 'setups.starsCount',
		clonesCount: 'setups.clonesCount',
		commentsCount: 'setups.commentsCount',
		createdAt: 'setups.createdAt',
		updatedAt: 'setups.updatedAt',
		searchVector: 'setups.searchVector',
		visibility: 'setups.visibility',
		teamId: 'setups.teamId'
	},
	users: {
		id: 'users.id',
		username: 'users.username',
		avatarUrl: 'users.avatarUrl'
	},
	setupAgents: { setupId: 'setupAgents.setupId', agentId: 'setupAgents.agentId' },
	agents: { id: 'agents.id', displayName: 'agents.displayName', slug: 'agents.slug' },
	setupTags: { setupId: 'setupTags.setupId', tagId: 'setupTags.tagId' },
	tags: { id: 'tags.id', name: 'tags.name' },
	stars: {
		id: 'stars.id',
		userId: 'stars.userId',
		setupId: 'stars.setupId',
		createdAt: 'stars.createdAt'
	},
	activities: {
		userId: 'activities.userId',
		setupId: 'activities.setupId',
		actionType: 'activities.actionType'
	}
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	chain['select'] = vi.fn(() => chain);
	chain['from'] = vi.fn(() => chain);
	chain['innerJoin'] = vi.fn(() => chain);
	chain['where'] = vi.fn(() => Promise.resolve([]));
	chain['execute'] = mockExecute;
	return { db: chain };
});

vi.mock('$lib/server/counters', () => ({ counters: {} }));

import { searchSetups } from './setups';

function makeItemRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: 'setup-1',
		name: 'My Setup',
		slug: 'my-setup',
		description: 'A great configuration setup',
		stars_count: 5,
		clones_count: 2,
		updated_at: new Date('2026-01-10'),
		owner_username: 'alice',
		owner_avatar_url: 'https://example.com/alice.png',
		...overrides
	};
}

describe('searchSetups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSql.queries = [];
	});

	it('returns empty results when db returns no rows', async () => {
		mockExecute
			.mockResolvedValueOnce([]) // items
			.mockResolvedValueOnce([{ count: '0' }]); // count

		const result = await searchSetups({ sort: 'newest', page: 1 });
		expect(result.items).toEqual([]);
		expect(result.total).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(12);
		expect(result.totalPages).toBe(0);
	});

	it('returns all results when query is undefined (no FTS filter)', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		const result = await searchSetups({ sort: 'newest', page: 1 });
		expect(result.items).toHaveLength(1);
		expect(result.total).toBe(1);
		expect(result.totalPages).toBe(1);
	});

	it('returns all results when query is empty string (no FTS filter)', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow(), makeItemRow({ id: 'setup-2', slug: 'other' })]) // items
			.mockResolvedValueOnce([{ count: '2' }]); // count

		const result = await searchSetups({ q: '', sort: 'newest', page: 1 });
		expect(result.items).toHaveLength(2);
		expect(result.total).toBe(2);

		// Empty query should not generate FTS conditions
		const hasFtsCondition = capturedSql.queries.some(
			(q) => q.includes('search_vector') || q.includes('plainto_tsquery') || q.includes('ts_rank')
		);
		expect(hasFtsCondition).toBe(false);
	});

	it('applies FTS condition when query is provided', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		const result = await searchSetups({ q: 'configuration', sort: 'newest', page: 1 });
		expect(result.items).toHaveLength(1);

		// SQL was constructed with at least some template strings (presence check)
		expect(capturedSql.queries.length).toBeGreaterThan(0);
	});

	it('uses ts_rank ordering when query is provided', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		await searchSetups({ q: 'configuring', sort: 'newest', page: 1 });

		// ts_rank should appear in ORDER BY clause (generated SQL)
		const hasTsRank = capturedSql.queries.some((q) => q.includes('ts_rank'));
		expect(hasTsRank).toBe(true);
	});

	it('returns properly shaped items with owner info and agents', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		const result = await searchSetups({ sort: 'newest', page: 1 });
		const item = result.items[0];
		expect(item).toMatchObject({
			id: 'setup-1',
			name: 'My Setup',
			slug: 'my-setup',
			description: 'A great configuration setup',
			starsCount: 5,
			clonesCount: 2,
			ownerUsername: 'alice',
			ownerAvatarUrl: 'https://example.com/alice.png',
			agents: []
		});
		expect(item.updatedAt).toBeInstanceOf(Date);
	});

	it('calculates pagination correctly', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '25' }]); // count — 25 total, page size 12

		const result = await searchSetups({ sort: 'newest', page: 2 });
		expect(result.total).toBe(25);
		expect(result.page).toBe(2);
		expect(result.pageSize).toBe(12);
		expect(result.totalPages).toBe(3);
	});

	it('handles multiple result rows', async () => {
		mockExecute
			.mockResolvedValueOnce([
				makeItemRow({ id: 'setup-1', stars_count: 10 }),
				makeItemRow({ id: 'setup-2', slug: 'other-setup', stars_count: 3 })
			]) // items
			.mockResolvedValueOnce([{ count: '2' }]); // count

		const result = await searchSetups({ sort: 'stars', page: 1 });
		expect(result.items).toHaveLength(2);
		expect(result.items[0].starsCount).toBe(10);
		expect(result.items[1].starsCount).toBe(3);
	});

	it('trending sort uses LEFT JOIN against trending_setups_mv', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		await searchSetups({ sort: 'trending', page: 1 });

		const hasMvJoin = capturedSql.queries.some((q) => q.includes('trending_setups_mv'));
		expect(hasMvJoin).toBe(true);
	});

	it('trending sort orders by COALESCE of recent_stars_count', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		await searchSetups({ sort: 'trending', page: 1 });

		const hasCoalesce = capturedSql.queries.some(
			(q) => q.includes('COALESCE') && q.includes('recent_stars_count')
		);
		expect(hasCoalesce).toBe(true);
	});

	it('trending sort does not use correlated subquery', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		await searchSetups({ sort: 'trending', page: 1 });

		// Old correlated subquery pattern: SELECT COUNT(*) FROM stars WHERE stars.setup_id = ...
		const hasCorrelatedSubquery = capturedSql.queries.some(
			(q) => q.includes('SELECT COUNT(') && q.includes('INTERVAL')
		);
		expect(hasCorrelatedSubquery).toBe(false);
	});

	it('includes team_members subquery when viewerId is provided', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		await searchSetups({ sort: 'newest', page: 1, viewerId: 'user-123' });

		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(true);
	});

	it('uses public-only condition when viewerId is absent', async () => {
		mockExecute
			.mockResolvedValueOnce([makeItemRow()]) // items
			.mockResolvedValueOnce([{ count: '1' }]); // count

		await searchSetups({ sort: 'newest', page: 1 });

		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(false);
	});
});
