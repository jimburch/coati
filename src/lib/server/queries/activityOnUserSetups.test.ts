import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));
const mockNe = vi.hoisted(() => vi.fn((a: unknown, b: unknown) => ({ _type: 'ne', a, b })));
const mockGte = vi.hoisted(() => vi.fn((a: unknown, b: unknown) => ({ _type: 'gte', a, b })));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	return {
		and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
		desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
		eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
		gte: mockGte,
		inArray: vi.fn((col: unknown, arr: unknown) => ({ _type: 'inArray', col, arr })),
		lt: vi.fn((a: unknown, b: unknown) => ({ _type: 'lt', a, b })),
		ne: mockNe,
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
	const chainMethods = ['select', 'from', 'innerJoin', 'leftJoin', 'where', 'orderBy'];
	for (const m of chainMethods) {
		chain[m] = vi.fn(() => chain);
	}
	chain['limit'] = vi.fn(() => Promise.resolve(state.rows));
	return { db: chain };
});

import { getActivityOnUserSetups } from './activities';

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		setupId: 'setup-1',
		setupName: 'My Setup',
		setupSlug: 'my-setup',
		actionType: 'starred_setup',
		actorUsername: 'alice',
		...overrides
	};
}

describe('getActivityOnUserSetups', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when no activities in window', async () => {
		state.rows = [];
		const result = await getActivityOnUserSetups('user-1');
		expect(result).toEqual([]);
	});

	it('aggregates starred_setup rows for same setup into single entry', async () => {
		state.rows = [
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'alice' }),
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'bob' })
		];
		const result = await getActivityOnUserSetups('user-1');
		expect(result).toHaveLength(1);
		expect(result[0].setupId).toBe('s1');
		expect(result[0].count).toBe(2);
		expect(result[0].actionType).toBe('starred_setup');
	});

	it('populates actorUsernames up to 3 for starred_setup', async () => {
		state.rows = [
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'alice' }),
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'bob' }),
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'carol' }),
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'dave' }),
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'eve' })
		];
		const result = await getActivityOnUserSetups('user-1');
		expect(result[0].count).toBe(5);
		expect(result[0].actorUsernames).toHaveLength(3);
		expect(result[0].actorUsernames).toEqual(['alice', 'bob', 'carol']);
	});

	it('returns empty actorUsernames for cloned_setup', async () => {
		state.rows = [makeRow({ setupId: 's1', actionType: 'cloned_setup', actorUsername: 'alice' })];
		const result = await getActivityOnUserSetups('user-1');
		expect(result[0].actionType).toBe('cloned_setup');
		expect(result[0].actorUsernames).toEqual([]);
		expect(result[0].count).toBe(1);
	});

	it('creates separate entries for different action types on same setup', async () => {
		state.rows = [
			makeRow({ setupId: 's1', actionType: 'starred_setup', actorUsername: 'alice' }),
			makeRow({ setupId: 's1', actionType: 'cloned_setup', actorUsername: 'bob' })
		];
		const result = await getActivityOnUserSetups('user-1');
		expect(result).toHaveLength(2);
		const types = result.map((e) => e.actionType).sort();
		expect(types).toEqual(['cloned_setup', 'starred_setup']);
	});

	it('creates separate entries for different setups', async () => {
		state.rows = [
			makeRow({
				setupId: 's1',
				setupName: 'Setup A',
				setupSlug: 'setup-a',
				actionType: 'starred_setup',
				actorUsername: 'alice'
			}),
			makeRow({
				setupId: 's2',
				setupName: 'Setup B',
				setupSlug: 'setup-b',
				actionType: 'starred_setup',
				actorUsername: 'bob'
			})
		];
		const result = await getActivityOnUserSetups('user-1');
		expect(result).toHaveLength(2);
		const ids = result.map((e) => e.setupId).sort();
		expect(ids).toEqual(['s1', 's2']);
	});

	it('skips rows with null setupId', async () => {
		state.rows = [makeRow({ setupId: null, actionType: 'starred_setup' })];
		const result = await getActivityOnUserSetups('user-1');
		expect(result).toEqual([]);
	});

	it('passes userId to ne filter to exclude self-actions', async () => {
		state.rows = [];
		await getActivityOnUserSetups('user-abc');
		expect(mockNe).toHaveBeenCalledWith('activities.userId', 'user-abc');
	});

	it('passes a date approximately sinceDays ago to gte for window filter', async () => {
		state.rows = [];
		const before = Date.now();
		await getActivityOnUserSetups('user-1', 7);
		const after = Date.now();

		expect(mockGte).toHaveBeenCalledOnce();
		const [, gteDate] = mockGte.mock.calls[0] as [unknown, Date];
		const gteDateMs = gteDate.getTime();
		const expectedMs = before - 7 * 24 * 60 * 60 * 1000;

		expect(gteDateMs).toBeGreaterThanOrEqual(expectedMs - 100);
		expect(gteDateMs).toBeLessThanOrEqual(after);
	});

	it('uses sinceDays parameter to compute window boundary', async () => {
		state.rows = [];
		const before = Date.now();
		await getActivityOnUserSetups('user-1', 14);

		const [, gteDate] = mockGte.mock.calls[0] as [unknown, Date];
		const gteDateMs = gteDate.getTime();
		const expectedMs = before - 14 * 24 * 60 * 60 * 1000;

		expect(gteDateMs).toBeGreaterThanOrEqual(expectedMs - 100);
		expect(gteDateMs).toBeLessThanOrEqual(before - 13 * 24 * 60 * 60 * 1000);
	});

	it('returns correct setupName and setupSlug from row', async () => {
		state.rows = [
			makeRow({
				setupId: 's1',
				setupName: 'My Awesome Setup',
				setupSlug: 'my-awesome-setup',
				actionType: 'starred_setup',
				actorUsername: 'alice'
			})
		];
		const result = await getActivityOnUserSetups('user-1');
		expect(result[0].setupName).toBe('My Awesome Setup');
		expect(result[0].setupSlug).toBe('my-awesome-setup');
	});
});
