import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, unknown>;

// Hoisted state: each .limit() call pops the next row set.
const state = vi.hoisted(() => ({
	rowSets: [] as Row[][],
	callIndex: 0
}));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	return {
		and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
		desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
		eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
		gte: vi.fn((a: unknown, b: unknown) => ({ _type: 'gte', a, b })),
		inArray: vi.fn((col: unknown, arr: unknown) => ({ _type: 'inArray', col, arr })),
		lt: vi.fn((a: unknown, b: unknown) => ({ _type: 'lt', a, b })),
		ne: vi.fn((a: unknown, b: unknown) => ({ _type: 'ne', a, b })),
		notInArray: vi.fn((col: unknown, arr: unknown) => ({ _type: 'notInArray', col, arr })),
		or: vi.fn((...args: unknown[]) => ({ _type: 'or', args })),
		sql: sqlFn
	};
});

vi.mock('drizzle-orm/pg-core', () => ({ alias: vi.fn(() => ({})) }));

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
		teamId: 'setups.teamId',
		starsCount: 'setups.starsCount'
	},
	teams: {
		id: 'teams.id',
		name: 'teams.name',
		slug: 'teams.slug',
		avatarUrl: 'teams.avatarUrl'
	},
	teamMembers: {
		teamId: 'team_members.team_id',
		userId: 'team_members.user_id'
	},
	users: {
		id: 'users.id',
		username: 'users.username',
		avatarUrl: 'users.avatarUrl',
		followersCount: 'users.followersCount'
	}
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	const methods = ['select', 'from', 'innerJoin', 'leftJoin', 'where', 'orderBy'];
	for (const m of methods) {
		chain[m] = vi.fn(() => chain);
	}
	chain['limit'] = vi.fn(() => {
		const next = state.rowSets[state.callIndex] ?? [];
		state.callIndex += 1;
		return Promise.resolve(next);
	});
	return { db: chain };
});

import { getBlendedActivityFeed } from './activityFeed';

function row(overrides: Partial<Row> = {}): Row {
	return {
		id: crypto.randomUUID(),
		actionType: 'created_setup',
		createdAt: new Date('2026-04-19T12:00:00Z'),
		userId: 'other-user',
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
		actorFollowersCount: 0,
		setupStarsCount: 0,
		...overrides
	};
}

describe('getBlendedActivityFeed', () => {
	beforeEach(() => {
		state.rowSets = [];
		state.callIndex = 0;
		vi.clearAllMocks();
	});

	it('returns empty items when all three buckets are empty', async () => {
		state.rowSets = [[], [], [], []]; // own, follows, popular, team_memberships
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items).toEqual([]);
	});

	it('fills up to limit from all three buckets', async () => {
		state.rowSets = [
			[row({ id: 'o1', userId: 'viewer-1', actorUsername: 'viewer' })], // own
			[
				row({ id: 'f1', userId: 'alice-id', actorUsername: 'alice' }),
				row({ id: 'f2', userId: 'bob-id', actorUsername: 'bob' })
			], // follows
			[row({ id: 'p1', userId: 'eve-id', actorUsername: 'eve', actorFollowersCount: 500 })], // popular
			[] // team memberships
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		const ids = result.items.map((i) => i.id).sort();
		expect(ids).toEqual(['f1', 'f2', 'o1', 'p1']);
	});

	it('marks own-bucket items with isOwnActivity true', async () => {
		state.rowSets = [[row({ id: 'o1', userId: 'viewer-1', actorUsername: 'viewer' })], [], [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items[0].isOwnActivity).toBe(true);
	});

	it('marks popular-bucket items with isPopular true', async () => {
		state.rowSets = [[], [], [row({ id: 'p1', actorFollowersCount: 500 })], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items[0].isPopular).toBe(true);
	});

	it('weights own above follows on equal recency', async () => {
		const sameTime = new Date('2026-04-19T12:00:00Z');
		state.rowSets = [
			[row({ id: 'own', createdAt: sameTime, userId: 'viewer-1', actorUsername: 'viewer' })],
			[row({ id: 'follow', createdAt: sameTime, actorUsername: 'alice' })],
			[],
			[]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items[0].id).toBe('own');
		expect(result.items[1].id).toBe('follow');
	});

	it('aggregates same-setup starred_setup events within 24h', async () => {
		const now = new Date('2026-04-19T12:00:00Z');
		state.rowSets = [
			[],
			[
				row({
					id: 's1',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					userId: 'alice-id',
					actorUsername: 'alice',
					createdAt: now
				}),
				row({
					id: 's2',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					userId: 'bob-id',
					actorUsername: 'bob',
					createdAt: new Date(now.getTime() - 60 * 60 * 1000)
				}),
				row({
					id: 's3',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					userId: 'carol-id',
					actorUsername: 'carol',
					createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
				})
			],
			[],
			[]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		const starredItems = result.items.filter((i) => i.actionType === 'starred_setup');
		expect(starredItems).toHaveLength(1);
		expect(starredItems[0].aggregatedCount).toBe(3);
		expect(starredItems[0].aggregatedActors).toHaveLength(2);
	});

	it('hides team events when viewer is not a member of that team', async () => {
		state.rowSets = [
			[],
			[row({ id: 'team-ev', actionType: 'joined_team', teamId: 'team-x', actorUsername: 'alice' })],
			[],
			[] // empty memberships
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items.find((i) => i.actionType === 'joined_team')).toBeUndefined();
	});

	it('shows team events when viewer IS a member', async () => {
		state.rowSets = [
			[],
			[row({ id: 'team-ev', actionType: 'joined_team', teamId: 'team-x', actorUsername: 'alice' })],
			[],
			[{ teamId: 'team-x' }]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items.find((i) => i.id === 'team-ev')).toBeDefined();
	});

	it('returns a nextCursor when there are more rows than limit', async () => {
		const rows = Array.from({ length: 12 }, (_, i) =>
			row({
				id: `r${i}`,
				userId: `user-${i}`,
				createdAt: new Date(new Date('2026-04-19T12:00:00Z').getTime() - i * 60_000)
			})
		);
		state.rowSets = [[], rows, [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items).toHaveLength(8);
		expect(result.nextCursor).not.toBeNull();
	});

	it('returns null nextCursor when total items ≤ limit', async () => {
		state.rowSets = [[row({ id: 'o1', userId: 'viewer-1', actorUsername: 'viewer' })], [], [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.nextCursor).toBeNull();
	});

	it('uses the oldest createdAt across the page as nextCursor (not the score-sorted last item)', async () => {
		// Build rows where a high-score recent item would sort last by score despite having a
		// newer createdAt than earlier-sorted items. If the cursor used the last item's createdAt,
		// the follow-up chronological page would re-fetch the older items and duplicate them.
		const baseTime = new Date('2026-04-19T12:00:00Z').getTime();
		const rows = Array.from({ length: 10 }, (_, i) =>
			row({
				id: `f${i}`,
				userId: `user-${i}`,
				createdAt: new Date(baseTime - i * 60 * 60 * 1000), // each 1h older
				actorFollowersCount: 0
			})
		);
		state.rowSets = [[], rows, [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 5);
		expect(result.items).toHaveLength(5);
		const expectedMin = new Date(
			Math.min(...result.items.map((i) => i.createdAt.getTime()))
		).toISOString();
		expect(result.nextCursor).toBe(expectedMin);
	});

	it('deduplicates repeated starred_setup rows by (user, setup) and shows actor once in aggregate', async () => {
		const now = new Date('2026-04-19T12:00:00Z');
		state.rowSets = [
			[
				// Two rows for the SAME user starring the SAME setup (e.g. star/unstar/star history)
				row({
					id: 's1',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					actorUsername: 'viewer',
					createdAt: now,
					userId: 'viewer-1'
				}),
				row({
					id: 's2',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					actorUsername: 'viewer',
					createdAt: new Date(now.getTime() - 60 * 60 * 1000),
					userId: 'viewer-1'
				})
			],
			[],
			[],
			[]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		const starredItems = result.items.filter((i) => i.actionType === 'starred_setup');
		// Duplicate rows collapsed into a single activity — no aggregation fields because only one distinct actor remains.
		expect(starredItems).toHaveLength(1);
		expect(starredItems[0].aggregatedActors).toBeUndefined();
		expect(starredItems[0].aggregatedCount).toBeUndefined();
	});

	it('deduplicates repeated followed_user rows by (user, target)', async () => {
		state.rowSets = [
			[
				row({
					id: 'f1',
					actionType: 'followed_user',
					setupId: null,
					targetUserId: 'target-1',
					actorUsername: 'viewer',
					userId: 'viewer-1'
				}),
				row({
					id: 'f2',
					actionType: 'followed_user',
					setupId: null,
					targetUserId: 'target-1',
					actorUsername: 'viewer',
					userId: 'viewer-1'
				})
			],
			[],
			[],
			[]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		const followItems = result.items.filter((i) => i.actionType === 'followed_user');
		expect(followItems).toHaveLength(1);
	});
});
