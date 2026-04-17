import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock state so it's accessible inside vi.mock factories
const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
const capturedSql = vi.hoisted(() => ({ queries: [] as string[] }));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		capturedSql.queries.push(strings.join('__'));
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	return {
		and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
		desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
		eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
		inArray: vi.fn((col: unknown, arr: unknown) => ({ _type: 'inArray', col, arr })),
		lt: vi.fn((a: unknown, b: unknown) => ({ _type: 'lt', a, b })),
		ne: vi.fn((a: unknown, b: unknown) => ({ _type: 'ne', a, b })),
		sql: sqlFn
	};
});

vi.mock('drizzle-orm/pg-core', () => ({
	alias: vi.fn(() => ({}))
}));

vi.mock('$lib/server/db/schema', () => ({
	activities: {
		id: 'activities.id',
		actionType: 'activities.actionType',
		createdAt: 'activities.createdAt',
		userId: 'activities.userId',
		setupId: 'activities.setupId',
		targetUserId: 'activities.targetUserId',
		commentId: 'activities.commentId',
		teamId: 'activities.teamId'
	},
	comments: { id: 'comments.id', body: 'comments.body' },
	follows: { followerId: 'follows.followerId', followingId: 'follows.followingId' },
	setups: {
		id: 'setups.id',
		userId: 'setups.userId',
		name: 'setups.name',
		slug: 'setups.slug',
		visibility: 'setups.visibility',
		teamId: 'setups.teamId'
	},
	teams: {
		id: 'teams.id',
		name: 'teams.name',
		slug: 'teams.slug',
		avatarUrl: 'teams.avatarUrl'
	},
	users: { id: 'users.id', username: 'users.username', avatarUrl: 'users.avatarUrl' }
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	const methods = ['select', 'from', 'innerJoin', 'leftJoin', 'where', 'orderBy'];
	for (const m of methods) {
		chain[m] = vi.fn(() => chain);
	}
	chain['limit'] = vi.fn(() => Promise.resolve(state.rows));
	return { db: chain };
});

import { getHomeFeed, getProfileFeed } from './activities';

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: 'act-1',
		actionType: 'created_setup',
		createdAt: new Date('2026-01-10T12:00:00Z'),
		actorUsername: 'alice',
		actorAvatarUrl: 'https://example.com/alice.png',
		setupId: 'setup-1',
		setupName: 'My Setup',
		setupSlug: 'my-setup',
		setupOwnerUsername: 'alice',
		targetUserId: null,
		targetUsername: null,
		targetAvatarUrl: null,
		commentId: null,
		commentBody: null,
		teamId: null,
		teamName: null,
		teamSlug: null,
		teamAvatarUrl: null,
		...overrides
	};
}

describe('getHomeFeed', () => {
	beforeEach(() => {
		state.rows = [];
		capturedSql.queries = [];
		vi.clearAllMocks();
	});

	it('returns items and null nextCursor when rows are at or below limit', async () => {
		state.rows = [makeRow({ id: 'act-1' }), makeRow({ id: 'act-2' })];

		const result = await getHomeFeed('user-1', undefined, 5);

		expect(result.items).toHaveLength(2);
		expect(result.nextCursor).toBeNull();
	});

	it('trims items to limit and sets nextCursor when rows exceed limit', async () => {
		const cursor1 = new Date('2026-01-10T12:00:00Z');
		const cursor2 = new Date('2026-01-10T11:00:00Z');
		// Return limit+1 rows (3 rows for limit=2)
		state.rows = [
			makeRow({ id: 'act-1', createdAt: cursor1 }),
			makeRow({ id: 'act-2', createdAt: cursor2 }),
			makeRow({ id: 'act-3', createdAt: new Date('2026-01-10T10:00:00Z') })
		];

		const result = await getHomeFeed('user-1', undefined, 2);

		expect(result.items).toHaveLength(2);
		expect(result.items[0].id).toBe('act-1');
		expect(result.items[1].id).toBe('act-2');
		expect(result.nextCursor).toBe(cursor2.toISOString());
	});

	it('returns null nextCursor when result is exactly limit rows', async () => {
		state.rows = [makeRow({ id: 'act-1' }), makeRow({ id: 'act-2' })];

		const result = await getHomeFeed('user-1', undefined, 2);

		expect(result.items).toHaveLength(2);
		expect(result.nextCursor).toBeNull();
	});

	it('returns empty items and null nextCursor when no rows', async () => {
		state.rows = [];

		const result = await getHomeFeed('user-1', undefined, 20);

		expect(result.items).toHaveLength(0);
		expect(result.nextCursor).toBeNull();
	});

	it('preserves actionType on returned items', async () => {
		state.rows = [makeRow({ actionType: 'commented' })];

		const result = await getHomeFeed('user-1', undefined, 5);

		expect(result.items[0].actionType).toBe('commented');
	});

	it('applies team_members visibility filter in feed', async () => {
		state.rows = [];

		await getHomeFeed('user-123', undefined, 20);

		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(true);
	});

	it('applies public-only visibility filter for null setupId activities', async () => {
		state.rows = [];

		await getHomeFeed('user-123', undefined, 20);

		const hasNullSetupIdCondition = capturedSql.queries.some((q) => q.includes('IS NULL'));
		expect(hasNullSetupIdCondition).toBe(true);
	});

	it('returns created_team actionType on team activity rows', async () => {
		state.rows = [
			makeRow({
				actionType: 'created_team',
				setupId: null,
				teamId: 'team-1',
				teamName: 'My Team',
				teamSlug: 'my-team'
			})
		];

		const result = await getHomeFeed('user-1', undefined, 5);

		expect(result.items[0].actionType).toBe('created_team');
		expect(result.items[0].teamId).toBe('team-1');
		expect(result.items[0].teamName).toBe('My Team');
		expect(result.items[0].teamSlug).toBe('my-team');
	});

	it('returns joined_team actionType on join activity rows', async () => {
		state.rows = [makeRow({ actionType: 'joined_team', setupId: null, teamId: 'team-1' })];

		const result = await getHomeFeed('user-1', undefined, 5);

		expect(result.items[0].actionType).toBe('joined_team');
	});

	it('returns left_team actionType on departure activity rows', async () => {
		state.rows = [makeRow({ actionType: 'left_team', setupId: null, teamId: 'team-1' })];

		const result = await getHomeFeed('user-1', undefined, 5);

		expect(result.items[0].actionType).toBe('left_team');
	});

	it('returns invited_to_team actionType on invite activity rows', async () => {
		state.rows = [
			makeRow({
				actionType: 'invited_to_team',
				setupId: null,
				teamId: 'team-1',
				targetUserId: 'user-2',
				targetUsername: 'bob'
			})
		];

		const result = await getHomeFeed('user-1', undefined, 5);

		expect(result.items[0].actionType).toBe('invited_to_team');
		expect(result.items[0].targetUserId).toBe('user-2');
		expect(result.items[0].targetUsername).toBe('bob');
	});
});

describe('getProfileFeed', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns items and null nextCursor when rows are at or below limit', async () => {
		state.rows = [makeRow({ id: 'act-1' }), makeRow({ id: 'act-2' })];

		const result = await getProfileFeed('user-1', undefined, 5);

		expect(result.items).toHaveLength(2);
		expect(result.nextCursor).toBeNull();
	});

	it('trims items to limit and sets nextCursor when rows exceed limit', async () => {
		const cursor1 = new Date('2026-01-10T12:00:00Z');
		const cursor2 = new Date('2026-01-10T11:00:00Z');
		state.rows = [
			makeRow({ id: 'act-1', createdAt: cursor1 }),
			makeRow({ id: 'act-2', createdAt: cursor2 }),
			makeRow({ id: 'act-3', createdAt: new Date('2026-01-10T10:00:00Z') })
		];

		const result = await getProfileFeed('user-1', undefined, 2);

		expect(result.items).toHaveLength(2);
		expect(result.nextCursor).toBe(cursor2.toISOString());
	});

	it('returns null nextCursor when result is exactly limit rows', async () => {
		state.rows = [makeRow({ id: 'act-1' }), makeRow({ id: 'act-2' })];

		const result = await getProfileFeed('user-1', undefined, 2);

		expect(result.items).toHaveLength(2);
		expect(result.nextCursor).toBeNull();
	});

	it('returns empty items and null nextCursor when no rows', async () => {
		state.rows = [];

		const result = await getProfileFeed('user-1', undefined, 5);

		expect(result.items).toHaveLength(0);
		expect(result.nextCursor).toBeNull();
	});

	it('preserves starred_setup actionType on profile feed items', async () => {
		state.rows = [makeRow({ actionType: 'starred_setup' })];

		const result = await getProfileFeed('user-1', undefined, 5);

		expect(result.items[0].actionType).toBe('starred_setup');
	});
});
