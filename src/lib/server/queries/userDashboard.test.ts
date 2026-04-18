import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLimit = vi.hoisted(() => vi.fn());

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
	desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
	sql: Object.assign(
		vi.fn((strings: TemplateStringsArray) => ({ _type: 'sql', raw: strings.join('') })),
		{ join: vi.fn() }
	)
}));

vi.mock('$lib/server/db/schema', () => ({
	users: { id: 'users.id', followersCount: 'users.followersCount' },
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
		updatedAt: 'setups.updatedAt'
	},
	follows: {
		id: 'follows.id',
		followerId: 'follows.followerId',
		followingId: 'follows.followingId',
		createdAt: 'follows.createdAt'
	}
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	const syncMethods = ['select', 'from', 'where', 'orderBy'];
	for (const m of syncMethods) {
		chain[m] = vi.fn(() => chain);
	}
	chain['limit'] = mockLimit;
	return { db: chain };
});

import { getUserAggregateStats, getUserSetups } from './users';

describe('getUserAggregateStats', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns computed stats for a user with setups and follows', async () => {
		mockLimit
			.mockReturnValueOnce(Promise.resolve([{ setupsCount: 3, starsReceived: 12, clonesTotal: 7 }]))
			.mockReturnValueOnce(Promise.resolve([{ followersCount: 5 }]));

		const result = await getUserAggregateStats('user-1');

		expect(result).toEqual({
			setupsCount: 3,
			starsReceived: 12,
			clonesTotal: 7,
			followersCount: 5
		});
	});

	it('returns zeros when user has no setups or follows', async () => {
		mockLimit
			.mockReturnValueOnce(Promise.resolve([{ setupsCount: 0, starsReceived: 0, clonesTotal: 0 }]))
			.mockReturnValueOnce(Promise.resolve([{ followersCount: 0 }]));

		const result = await getUserAggregateStats('user-empty');

		expect(result).toEqual({
			setupsCount: 0,
			starsReceived: 0,
			clonesTotal: 0,
			followersCount: 0
		});
	});

	it('returns zeros when aggregate queries return empty arrays', async () => {
		mockLimit.mockReturnValueOnce(Promise.resolve([])).mockReturnValueOnce(Promise.resolve([]));

		const result = await getUserAggregateStats('user-new');

		expect(result).toEqual({
			setupsCount: 0,
			starsReceived: 0,
			clonesTotal: 0,
			followersCount: 0
		});
	});
});

describe('getUserSetups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns empty array when user has no setups', async () => {
		mockLimit.mockReturnValueOnce(Promise.resolve([]));

		const result = await getUserSetups('user-1', 5);

		expect(result).toEqual([]);
	});

	it('returns setups ordered by updatedAt desc up to the limit', async () => {
		const rows = [
			{
				id: 'setup-1',
				name: 'Alpha',
				slug: 'alpha',
				description: 'First',
				display: null,
				visibility: 'public',
				starsCount: 2,
				clonesCount: 1,
				updatedAt: new Date('2026-03-10')
			},
			{
				id: 'setup-2',
				name: 'Beta',
				slug: 'beta',
				description: 'Second',
				display: 'Beta Display',
				visibility: 'private',
				starsCount: 0,
				clonesCount: 0,
				updatedAt: new Date('2026-02-01')
			}
		];
		mockLimit.mockReturnValueOnce(Promise.resolve(rows));

		const result = await getUserSetups('user-1', 5);

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({ id: 'setup-1', name: 'Alpha', starsCount: 2 });
		expect(result[1]).toMatchObject({ id: 'setup-2', name: 'Beta', display: 'Beta Display' });
	});

	it('includes visibility field including private setups', async () => {
		const rows = [
			{
				id: 'setup-3',
				name: 'Private Setup',
				slug: 'private-setup',
				description: 'My private work',
				display: null,
				visibility: 'private',
				starsCount: 0,
				clonesCount: 0,
				updatedAt: new Date('2026-04-01')
			}
		];
		mockLimit.mockReturnValueOnce(Promise.resolve(rows));

		const result = await getUserSetups('user-1', 5);

		expect(result[0].visibility).toBe('private');
	});
});
