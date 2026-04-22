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
	follows: {
		id: 'follows.id',
		followerId: 'follows.followerId',
		followingId: 'follows.followingId',
		createdAt: 'follows.createdAt'
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

import { getSetupsFromFollowedUsers } from './setups';

function makeSetupRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: 'setup-1',
		name: 'My Setup',
		slug: 'my-setup',
		description: 'A great setup',
		display: null,
		stars_count: 10,
		clones_count: 3,
		created_at: new Date('2026-04-01'),
		updated_at: new Date('2026-04-01'),
		owner_username: 'alice',
		owner_avatar_url: 'https://example.com/alice.png',
		...overrides
	};
}

describe('getSetupsFromFollowedUsers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSql.queries = [];
		mockExecute.mockResolvedValue([]);
		mockWhere.mockReturnValue(Promise.resolve([]));
	});

	it('returns empty array when followed users have no setups', async () => {
		mockExecute.mockResolvedValue([]);

		const result = await getSetupsFromFollowedUsers('user-1', 6);
		expect(result).toEqual([]);
	});

	it('returns shaped results with correct field mapping', async () => {
		mockExecute.mockResolvedValue([makeSetupRow()]);

		const result = await getSetupsFromFollowedUsers('user-1', 1);
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
		expect(result[0].createdAt).toBeInstanceOf(Date);
	});

	it('returns only setups from followed users via follows subquery', async () => {
		mockExecute.mockResolvedValue([makeSetupRow()]);

		await getSetupsFromFollowedUsers('user-1', 6);

		const hasFollowsSubquery = capturedSql.queries.some(
			(q) => q.includes('follows') && q.includes('follower_id')
		);
		expect(hasFollowsSubquery).toBe(true);
	});

	it('orders results by DESC', async () => {
		mockExecute.mockResolvedValue([]);

		await getSetupsFromFollowedUsers('user-1', 6);

		const hasDesc = capturedSql.queries.some((q) => q.includes('DESC'));
		expect(hasDesc).toBe(true);
	});

	it('respects the limit parameter', async () => {
		const rows = Array.from({ length: 6 }, (_, i) =>
			makeSetupRow({ id: `setup-${i + 1}`, slug: `setup-${i + 1}` })
		);
		mockExecute.mockResolvedValue(rows);

		const result = await getSetupsFromFollowedUsers('user-1', 6);
		expect(result).toHaveLength(6);
	});

	it('only returns public setups', async () => {
		mockExecute.mockResolvedValue([]);

		await getSetupsFromFollowedUsers('user-1', 6);

		const hasPublicFilter = capturedSql.queries.some((q) => q.includes('public'));
		expect(hasPublicFilter).toBe(true);
	});

	it('returns setups in createdAt desc order when multiple setups exist', async () => {
		const rows = [
			makeSetupRow({ id: 'setup-newer', created_at: new Date('2026-04-10') }),
			makeSetupRow({ id: 'setup-older', slug: 'older', created_at: new Date('2026-03-01') })
		];
		mockExecute.mockResolvedValue(rows);

		const result = await getSetupsFromFollowedUsers('user-1', 6);
		expect(result[0].id).toBe('setup-newer');
		expect(result[1].id).toBe('setup-older');
	});

	it('maps multiple rows to shaped output', async () => {
		mockExecute.mockResolvedValue([
			makeSetupRow({ id: 'a', slug: 'a' }),
			makeSetupRow({ id: 'b', slug: 'b' })
		]);

		const result = await getSetupsFromFollowedUsers('user-1', 6);
		expect(result).toHaveLength(2);
		expect(result.map((r) => r.id)).toEqual(['a', 'b']);
	});
});
