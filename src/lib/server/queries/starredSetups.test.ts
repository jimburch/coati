import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
	and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
	desc: vi.fn((col: unknown) => ({ _type: 'desc', col }))
}));

vi.mock('$lib/server/db/schema', () => ({
	stars: {
		userId: 'stars.userId',
		setupId: 'stars.setupId',
		createdAt: 'stars.createdAt'
	},
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
	users: {
		id: 'users.id',
		username: 'users.username',
		avatarUrl: 'users.avatarUrl'
	}
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	const syncMethods = ['select', 'from', 'innerJoin', 'where'];
	for (const m of syncMethods) {
		chain[m] = vi.fn(() => chain);
	}
	// orderBy is the terminal call — returns a Promise
	chain['orderBy'] = vi.fn(() => Promise.resolve(state.rows));
	chain['limit'] = vi.fn(() => Promise.resolve(state.rows));
	return { db: chain };
});

import { getStarredSetupsByUserId } from './setups';

function makeRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: 'setup-1',
		name: 'My Setup',
		slug: 'my-setup',
		description: 'A great setup',
		display: null,
		starsCount: 3,
		clonesCount: 1,
		updatedAt: new Date('2026-01-10'),
		ownerUsername: 'alice',
		ownerAvatarUrl: 'https://example.com/alice.png',
		...overrides
	};
}

describe('getStarredSetupsByUserId', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns empty array when user has no stars', async () => {
		state.rows = [];
		const result = await getStarredSetupsByUserId('user-1');
		expect(result).toEqual([]);
	});

	it('returns SetupCard-shaped rows with owner info', async () => {
		state.rows = [makeRow()];
		const result = await getStarredSetupsByUserId('user-1');
		expect(result).toHaveLength(1);
		const row = result[0];
		expect(row).toMatchObject({
			id: 'setup-1',
			name: 'My Setup',
			slug: 'my-setup',
			description: 'A great setup',
			starsCount: 3,
			clonesCount: 1,
			ownerUsername: 'alice',
			ownerAvatarUrl: 'https://example.com/alice.png'
		});
	});

	it('returns multiple rows', async () => {
		state.rows = [makeRow({ id: 'setup-1' }), makeRow({ id: 'setup-2', slug: 'other-setup' })];
		const result = await getStarredSetupsByUserId('user-1');
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('setup-1');
		expect(result[1].id).toBe('setup-2');
	});

	it('includes display field in returned rows', async () => {
		state.rows = [makeRow({ display: 'My Display Name' })];
		const result = await getStarredSetupsByUserId('user-1');
		expect(result[0]).toHaveProperty('display', 'My Display Name');
	});

	it('returns display as null when not set', async () => {
		state.rows = [makeRow({ display: null })];
		const result = await getStarredSetupsByUserId('user-1');
		expect(result[0]).toHaveProperty('display', null);
	});
});
