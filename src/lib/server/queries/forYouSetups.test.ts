import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWhere = vi.hoisted(() => vi.fn());
const mockExecute = vi.hoisted(() => vi.fn());
const capturedSql = vi.hoisted(() => ({ queries: [] as string[] }));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		capturedSql.queries.push(strings.join('__'));
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	sqlFn.join = vi.fn((parts: unknown[], sep: unknown) => ({ _type: 'sql-join', parts, sep }));
	return {
		sql: sqlFn,
		eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
		and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
		desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
		inArray: vi.fn((col: unknown, vals: unknown) => ({ _type: 'inArray', col, vals })),
		isNotNull: vi.fn(() => ({}))
	};
});

vi.mock('$lib/server/db/schema', () => ({
	setups: {
		id: 'setups.id',
		userId: 'setups.userId',
		name: 'setups.name',
		slug: 'setups.slug',
		description: 'setups.description',
		display: 'setups.display',
		visibility: 'setups.visibility',
		starsCount: 'setups.starsCount',
		clonesCount: 'setups.clonesCount',
		commentsCount: 'setups.commentsCount',
		createdAt: 'setups.createdAt',
		updatedAt: 'setups.updatedAt',
		searchVector: 'setups.searchVector',
		featuredAt: 'setups.featuredAt',
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
	chain['where'] = mockWhere;
	chain['execute'] = mockExecute;
	return { db: chain };
});

vi.mock('$lib/server/counters', () => ({ counters: {} }));
vi.mock('$lib/utils/readme', () => ({ generateReadme: vi.fn(() => '# readme') }));

import { getForYouSetups } from './setups';

function makeSetupRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: 'setup-1',
		name: 'My Setup',
		slug: 'my-setup',
		description: 'A great setup',
		display: null,
		stars_count: 10,
		clones_count: 3,
		updated_at: new Date('2026-04-01'),
		owner_username: 'alice',
		owner_avatar_url: 'https://example.com/alice.png',
		...overrides
	};
}

describe('getForYouSetups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSql.queries = [];
		mockWhere.mockReturnValue(Promise.resolve([]));
		mockExecute.mockReturnValue(Promise.resolve([]));
	});

	it('returns empty array when no trending setups exist and user has no agents', async () => {
		mockWhere.mockReturnValueOnce(Promise.resolve([])); // agent lookup → no agents
		mockExecute.mockResolvedValueOnce([]); // trending → empty
		mockExecute.mockResolvedValueOnce([]); // backfill → empty

		const result = await getForYouSetups('user-1', 6);
		expect(result).toEqual([]);
	});

	it('returns shaped results with correct field mapping', async () => {
		mockWhere.mockReturnValueOnce(Promise.resolve([{ agentId: 'agent-1' }]));
		mockExecute.mockResolvedValueOnce([makeSetupRow()]);

		const result = await getForYouSetups('user-1', 1);
		expect(result[0]).toMatchObject({
			id: 'setup-1',
			name: 'My Setup',
			slug: 'my-setup',
			description: 'A great setup',
			display: null,
			starsCount: 10,
			clonesCount: 3,
			ownerUsername: 'alice',
			ownerAvatarUrl: 'https://example.com/alice.png',
			agents: []
		});
		expect(result[0].updatedAt).toBeInstanceOf(Date);
	});

	describe('agent-filtered path', () => {
		it('uses agent subquery filter when user has agents', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([{ agentId: 'agent-1' }]));
			mockExecute.mockResolvedValueOnce([makeSetupRow()]);

			await getForYouSetups('user-1', 6);

			const hasAgentFilter = capturedSql.queries.some((q) => q.includes('setup_agents sa'));
			expect(hasAgentFilter).toBe(true);
		});

		it('excludes user own setups via != condition', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([{ agentId: 'agent-1' }]));
			mockExecute.mockResolvedValueOnce([]);
			mockExecute.mockResolvedValueOnce([]);

			await getForYouSetups('user-1', 6);

			const hasOwnExclusion = capturedSql.queries.some((q) => q.includes('!='));
			expect(hasOwnExclusion).toBe(true);
		});

		it('excludes starred setups via stars NOT IN subquery', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([{ agentId: 'agent-1' }]));
			mockExecute.mockResolvedValueOnce([]);
			mockExecute.mockResolvedValueOnce([]);

			await getForYouSetups('user-1', 6);

			const hasStarsExclusion = capturedSql.queries.some(
				(q) => q.includes('stars') && q.includes('NOT IN')
			);
			expect(hasStarsExclusion).toBe(true);
		});

		it('returns up to limit results from trending mv', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([{ agentId: 'agent-1' }]));
			const rows = Array.from({ length: 6 }, (_, i) =>
				makeSetupRow({ id: `setup-${i + 1}`, slug: `setup-${i + 1}` })
			);
			mockExecute.mockResolvedValueOnce(rows);

			const result = await getForYouSetups('user-1', 6);
			expect(result).toHaveLength(6);
		});

		it('deduplicates agent IDs from multiple user setups', async () => {
			// Same agentId on two setups → should still work (dedup is internal)
			mockWhere.mockReturnValueOnce(
				Promise.resolve([{ agentId: 'agent-1' }, { agentId: 'agent-1' }])
			);
			mockExecute.mockResolvedValueOnce([makeSetupRow()]);

			const result = await getForYouSetups('user-1', 1);
			expect(result).toHaveLength(1);
		});
	});

	describe('no-setups fallback', () => {
		it('returns global trending results when user has no agents', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([])); // no agents
			mockExecute.mockResolvedValueOnce([makeSetupRow({ id: 'setup-fallback' })]);

			const result = await getForYouSetups('user-1', 6);
			expect(result[0].id).toBe('setup-fallback');
		});

		it('does not include setup_agents subquery filter in fallback path', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([])); // no agents
			mockExecute.mockResolvedValueOnce([]);
			mockExecute.mockResolvedValueOnce([]);

			await getForYouSetups('user-1', 6);

			const hasAgentFilter = capturedSql.queries.some((q) => q.includes('setup_agents sa'));
			expect(hasAgentFilter).toBe(false);
		});

		it('still excludes starred setups in fallback path', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([])); // no agents
			mockExecute.mockResolvedValueOnce([]);
			mockExecute.mockResolvedValueOnce([]);

			await getForYouSetups('user-1', 6);

			const hasStarsExclusion = capturedSql.queries.some(
				(q) => q.includes('stars') && q.includes('NOT IN')
			);
			expect(hasStarsExclusion).toBe(true);
		});

		it('still queries trending_setups_mv in fallback path', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([]));
			mockExecute.mockResolvedValueOnce([]);
			mockExecute.mockResolvedValueOnce([]);

			await getForYouSetups('user-1', 6);

			const hasTrendingMv = capturedSql.queries.some((q) => q.includes('trending_setups_mv'));
			expect(hasTrendingMv).toBe(true);
		});
	});

	describe('backfill', () => {
		it('combines trending and backfill results when trending is insufficient', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([])); // no agents
			mockExecute
				.mockResolvedValueOnce([makeSetupRow({ id: 'setup-1' })]) // trending: 1 of 3
				.mockResolvedValueOnce([makeSetupRow({ id: 'setup-2', slug: 'setup-2' })]); // backfill

			const result = await getForYouSetups('user-1', 3);
			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('setup-1');
			expect(result[1].id).toBe('setup-2');
		});

		it('does not run backfill when trending fills all slots', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([])); // no agents
			const rows = Array.from({ length: 3 }, (_, i) =>
				makeSetupRow({ id: `setup-${i + 1}`, slug: `setup-${i + 1}` })
			);
			mockExecute.mockResolvedValueOnce(rows);

			await getForYouSetups('user-1', 3);

			expect(mockExecute).toHaveBeenCalledTimes(1);
		});

		it('backfill query excludes setups already in trending_setups_mv', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([])); // no agents
			mockExecute
				.mockResolvedValueOnce([]) // trending: empty
				.mockResolvedValueOnce([]); // backfill: empty

			await getForYouSetups('user-1', 3);

			// Second execute call is the backfill
			const backfillQuery = capturedSql.queries[1];
			expect(backfillQuery).toContain('NOT IN');
			expect(backfillQuery).toContain('trending_setups_mv');
		});

		it('backfill with agent filter also uses agent subquery', async () => {
			mockWhere.mockReturnValueOnce(Promise.resolve([{ agentId: 'agent-1' }])); // has agents
			mockExecute
				.mockResolvedValueOnce([]) // trending agent-filtered: empty
				.mockResolvedValueOnce([]); // backfill agent-filtered: empty

			await getForYouSetups('user-1', 3);

			// Both queries should contain setup_agents sa
			const agentFilteredQueries = capturedSql.queries.filter((q) => q.includes('setup_agents sa'));
			expect(agentFilteredQueries.length).toBeGreaterThanOrEqual(2);
		});
	});
});
