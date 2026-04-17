import { describe, it, expect, vi, beforeEach } from 'vitest';

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
		eq: vi.fn(() => ({})),
		and: vi.fn(() => ({})),
		desc: vi.fn(() => ({})),
		inArray: vi.fn(() => ({})),
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
		starsCount: 'setups.starsCount',
		clonesCount: 'setups.clonesCount',
		commentsCount: 'setups.commentsCount',
		createdAt: 'setups.createdAt',
		updatedAt: 'setups.updatedAt',
		searchVector: 'setups.searchVector',
		featuredAt: 'setups.featuredAt',
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
vi.mock('$lib/utils/readme', () => ({ generateReadme: vi.fn(() => '# readme') }));

import { getTrendingSetups } from './setups';

function makeTrendingRow(
	overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
	return {
		id: 'setup-1',
		name: 'Trending Setup',
		slug: 'trending-setup',
		description: 'A trending setup',
		stars_count: 20,
		clones_count: 5,
		updated_at: new Date('2026-03-01'),
		owner_username: 'alice',
		owner_avatar_url: 'https://example.com/alice.png',
		...overrides
	};
}

describe('getTrendingSetups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSql.queries = [];
	});

	// Tracer bullet: all slots filled by materialized view
	it('returns limit results when MV has enough setups', async () => {
		const rows = [
			makeTrendingRow({ id: 'setup-1' }),
			makeTrendingRow({ id: 'setup-2', slug: 'setup-2' }),
			makeTrendingRow({ id: 'setup-3', slug: 'setup-3' })
		];
		mockExecute.mockResolvedValueOnce(rows); // trending query only

		const result = await getTrendingSetups(3);
		expect(result).toHaveLength(3);
	});

	it('returns properly shaped items with owner info and agents', async () => {
		mockExecute
			.mockResolvedValueOnce([makeTrendingRow()]) // trending: 1 row
			.mockResolvedValueOnce([]); // backfill: empty (limit=3, so backfill runs)

		const result = await getTrendingSetups(3);
		expect(result[0]).toMatchObject({
			id: 'setup-1',
			name: 'Trending Setup',
			slug: 'trending-setup',
			description: 'A trending setup',
			starsCount: 20,
			clonesCount: 5,
			ownerUsername: 'alice',
			ownerAvatarUrl: 'https://example.com/alice.png',
			agents: []
		});
		expect(result[0].updatedAt).toBeInstanceOf(Date);
	});

	it('queries trending_setups_mv via INNER JOIN', async () => {
		mockExecute
			.mockResolvedValueOnce([]) // trending: empty
			.mockResolvedValueOnce([]); // backfill

		await getTrendingSetups(5);

		const hasMvJoin = capturedSql.queries.some((q) => q.includes('trending_setups_mv'));
		expect(hasMvJoin).toBe(true);
	});

	// Backfill: fewer trending than limit
	it('calls backfill query when MV returns fewer than limit', async () => {
		const trendingRows = [makeTrendingRow({ id: 'setup-1' })];
		const backfillRows = [
			makeTrendingRow({ id: 'setup-2', slug: 'setup-2', stars_count: 15 }),
			makeTrendingRow({ id: 'setup-3', slug: 'setup-3', stars_count: 10 })
		];
		mockExecute
			.mockResolvedValueOnce(trendingRows) // trending query
			.mockResolvedValueOnce(backfillRows); // backfill query

		const result = await getTrendingSetups(3);
		expect(result).toHaveLength(3);
		// trending first, then backfill
		expect(result[0].id).toBe('setup-1');
		expect(result[1].id).toBe('setup-2');
		expect(result[2].id).toBe('setup-3');
	});

	it('backfill uses DESC ordering (starsCount DESC)', async () => {
		mockExecute
			.mockResolvedValueOnce([]) // trending: empty
			.mockResolvedValueOnce([]); // backfill

		await getTrendingSetups(5);

		// Backfill query should include NOT IN exclusion and ORDER BY ... DESC
		// Note: interpolated values (like setups.starsCount) appear in values, not template strings
		const hasBackfillWithDescSort = capturedSql.queries.some(
			(q) => q.includes('NOT IN') && q.includes('ORDER BY') && q.includes('DESC')
		);
		expect(hasBackfillWithDescSort).toBe(true);
	});

	it('backfill excludes setups already in materialized view to prevent duplicates', async () => {
		mockExecute
			.mockResolvedValueOnce([makeTrendingRow({ id: 'setup-1' })]) // trending
			.mockResolvedValueOnce([]); // backfill

		await getTrendingSetups(5);

		// Backfill query should exclude MV setups
		const hasExclusion = capturedSql.queries.some(
			(q) => q.includes('NOT IN') && q.includes('trending_setups_mv')
		);
		expect(hasExclusion).toBe(true);
	});

	// Zero trending setups
	it('returns all results from backfill when MV has no setups', async () => {
		const backfillRows = [
			makeTrendingRow({ id: 'setup-a', stars_count: 100 }),
			makeTrendingRow({ id: 'setup-b', slug: 'setup-b', stars_count: 50 })
		];
		mockExecute
			.mockResolvedValueOnce([]) // trending: zero
			.mockResolvedValueOnce(backfillRows); // backfill

		const result = await getTrendingSetups(5);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('setup-a');
		expect(result[1].id).toBe('setup-b');
	});

	it('does not call backfill when MV fills all slots exactly', async () => {
		const rows = [
			makeTrendingRow({ id: 'setup-1' }),
			makeTrendingRow({ id: 'setup-2', slug: 'setup-2' })
		];
		mockExecute.mockResolvedValueOnce(rows);

		await getTrendingSetups(2);

		// execute should be called only once (trending), not a second time (backfill)
		expect(mockExecute).toHaveBeenCalledTimes(1);
	});

	it('returns empty array when database has no setups', async () => {
		mockExecute
			.mockResolvedValueOnce([]) // trending: empty
			.mockResolvedValueOnce([]); // backfill: also empty

		const result = await getTrendingSetups(5);
		expect(result).toEqual([]);
	});

	it('includes team_members subquery when viewerId is provided', async () => {
		mockExecute.mockResolvedValueOnce([makeTrendingRow()]); // trending

		await getTrendingSetups(1, 'user-123');

		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(true);
	});

	it('uses public-only visibility condition when viewerId is absent', async () => {
		mockExecute
			.mockResolvedValueOnce([]) // trending: empty
			.mockResolvedValueOnce([]); // backfill

		await getTrendingSetups(5);

		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(false);
	});
});
