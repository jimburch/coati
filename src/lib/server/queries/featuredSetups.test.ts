import { describe, it, expect, vi, beforeEach } from 'vitest';

const capturedSql = vi.hoisted(() => ({ queries: [] as string[] }));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		capturedSql.queries.push(strings.join('__'));
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	sqlFn.join = vi.fn();
	return {
		eq: vi.fn((col, val) => ({ _type: 'eq', col, val })),
		desc: vi.fn((col) => ({ _type: 'desc', col })),
		isNotNull: vi.fn((col) => ({ _type: 'isNotNull', col })),
		and: vi.fn(),
		sql: sqlFn,
		inArray: vi.fn()
	};
});

vi.mock('$lib/server/db/schema', () => ({
	setups: {
		id: 'setups.id',
		userId: 'setups.userId',
		name: 'setups.name',
		slug: 'setups.slug',
		description: 'setups.description',
		readme: 'setups.readme',
		starsCount: 'setups.starsCount',
		clonesCount: 'setups.clonesCount',
		commentsCount: 'setups.commentsCount',
		featuredAt: 'setups.featuredAt',
		createdAt: 'setups.createdAt',
		updatedAt: 'setups.updatedAt',
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

// Track the last update call's set/where arguments
const updateState = vi.hoisted(() => ({
	setCall: null as Record<string, unknown> | null,
	whereCall: null as unknown
}));

// selectResults: queue of results for successive db.select() calls
// First call = featured setups query, second call = agents query (always [])
const selectResults = vi.hoisted(() => ({ queue: [] as unknown[][] }));

vi.mock('$lib/server/db', () => {
	function makeSelectChain(result: unknown[]) {
		const chain: Record<string, unknown> = {};
		chain['select'] = vi.fn(() => chain);
		chain['from'] = vi.fn(() => chain);
		chain['innerJoin'] = vi.fn(() => chain);
		// where() returns chain so we can call .orderBy().limit() OR resolves as promise for agent queries
		chain['where'] = vi.fn(() => chain);
		chain['orderBy'] = vi.fn(() => chain);
		// limit() resolves — used by getFeaturedSetups main query
		chain['limit'] = vi.fn(() => Promise.resolve(result));
		// Make where() also thenable so agent queries (which end with .where()) work
		// by making the chain itself a Promise-like for .where() terminal calls
		return chain;
	}

	const dbMock = {
		select: vi.fn(() => {
			const result = selectResults.queue.shift() ?? [];
			const chain = makeSelectChain(result);
			// Override where() to return a Promise for agent sub-queries
			// We detect terminal where() by checking if orderBy is called after
			// Strategy: wrap the chain's where to be both thenable AND chainable
			chain['where'] = vi.fn(() => {
				const nextChain = {
					...chain,
					then: (resolve: (v: unknown[]) => void) => resolve(result),
					orderBy: chain['orderBy'],
					limit: chain['limit']
				};
				// Also make it directly thenable for terminal .where() awaits
				Object.defineProperty(nextChain, 'then', {
					value: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
					configurable: true
				});
				return nextChain;
			});
			return chain;
		}),
		update: vi.fn(() => {
			const chain: Record<string, unknown> = {};
			chain['set'] = vi.fn((val) => {
				updateState.setCall = val;
				return chain;
			});
			chain['where'] = vi.fn((val) => {
				updateState.whereCall = val;
				return Promise.resolve();
			});
			return chain;
		})
	};
	return { db: dbMock };
});

vi.mock('$lib/server/counters', () => ({ counters: {} }));

import { getFeaturedSetups, setFeatured } from './setups';
import { db } from '$lib/server/db';

function makeSetupRow(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		id: 'setup-1',
		userId: 'user-1',
		name: 'Featured Setup',
		slug: 'featured-setup',
		description: 'A featured setup',
		starsCount: 10,
		clonesCount: 5,
		commentsCount: 2,
		featuredAt: new Date('2026-03-01T00:00:00Z'),
		createdAt: new Date('2026-01-01T00:00:00Z'),
		updatedAt: new Date('2026-02-01T00:00:00Z'),
		ownerUsername: 'alice',
		ownerAvatarUrl: 'https://example.com/alice.png',
		...overrides
	};
}

describe('getFeaturedSetups', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateState.setCall = null;
		updateState.whereCall = null;
		selectResults.queue = [];
		capturedSql.queries = [];
	});

	it('returns empty array when no featured setups exist', async () => {
		selectResults.queue = [[], []]; // featured query, agents query
		const result = await getFeaturedSetups(10);
		expect(result).toEqual([]);
	});

	it('returns featured setups with owner data', async () => {
		selectResults.queue = [[makeSetupRow()], []];
		const result = await getFeaturedSetups(10);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 'setup-1',
			name: 'Featured Setup',
			slug: 'featured-setup',
			starsCount: 10,
			clonesCount: 5,
			ownerUsername: 'alice',
			ownerAvatarUrl: 'https://example.com/alice.png'
		});
	});

	it('respects the limit parameter', async () => {
		selectResults.queue = [[], []];
		const selectSpy = db.select as ReturnType<typeof vi.fn>;

		await getFeaturedSetups(5);

		const chain = selectSpy.mock.results[0].value;
		expect(chain.limit).toHaveBeenCalledWith(5);
	});

	it('orders by featuredAt DESC', async () => {
		selectResults.queue = [[], []];
		const selectSpy = db.select as ReturnType<typeof vi.fn>;

		await getFeaturedSetups(10);

		const { desc } = await import('drizzle-orm');
		expect(desc).toHaveBeenCalledWith('setups.featuredAt');

		const chain = selectSpy.mock.results[0].value;
		expect(chain.orderBy).toHaveBeenCalledWith({ _type: 'desc', col: 'setups.featuredAt' });
	});

	it('filters by isNotNull on featuredAt', async () => {
		selectResults.queue = [[], []];

		await getFeaturedSetups(10);

		const { isNotNull } = await import('drizzle-orm');
		expect(isNotNull).toHaveBeenCalledWith('setups.featuredAt');
	});

	it('returns multiple setups in the order returned by db', async () => {
		const row1 = makeSetupRow({ id: 'setup-1', name: 'Newer Featured' });
		const row2 = makeSetupRow({ id: 'setup-2', name: 'Older Featured' });
		selectResults.queue = [[row1, row2], []];

		const result = await getFeaturedSetups(10);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('setup-1');
		expect(result[1].id).toBe('setup-2');
	});

	it('includes agents array in result', async () => {
		selectResults.queue = [[makeSetupRow()], []];
		const result = await getFeaturedSetups(10);
		expect(result[0]).toHaveProperty('agents');
		expect(Array.isArray(result[0].agents)).toBe(true);
	});

	it('includes featuredAt in each result row', async () => {
		const featuredAt = new Date('2026-03-01T00:00:00Z');
		selectResults.queue = [[makeSetupRow({ featuredAt })], []];
		const result = await getFeaturedSetups(10);
		expect(result[0].featuredAt).toEqual(featuredAt);
	});

	it('includes team_members subquery when viewerId is provided', async () => {
		selectResults.queue = [[], []];
		await getFeaturedSetups(5, 'user-123');
		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(true);
	});

	it('uses public-only condition when viewerId is absent', async () => {
		selectResults.queue = [[], []];
		await getFeaturedSetups(5);
		const hasTeamMembersCondition = capturedSql.queries.some((q) => q.includes('team_members'));
		expect(hasTeamMembersCondition).toBe(false);
	});
});

describe('setFeatured', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateState.setCall = null;
		updateState.whereCall = null;
		selectResults.queue = [];
	});

	it('sets featuredAt to a Date when featuring', async () => {
		await setFeatured('setup-1', true);

		expect(updateState.setCall).not.toBeNull();
		expect(updateState.setCall!.featuredAt).toBeInstanceOf(Date);
	});

	it('sets featuredAt to null when unfeaturing', async () => {
		await setFeatured('setup-1', false);

		expect(updateState.setCall).not.toBeNull();
		expect(updateState.setCall!.featuredAt).toBeNull();
	});

	it('targets correct setupId in where clause', async () => {
		await setFeatured('setup-abc', true);

		const { eq } = await import('drizzle-orm');
		expect(eq).toHaveBeenCalledWith('setups.id', 'setup-abc');
		expect(updateState.whereCall).toEqual({ _type: 'eq', col: 'setups.id', val: 'setup-abc' });
	});

	it('toggling: feature then unfeature sets null', async () => {
		await setFeatured('setup-1', true);
		expect(updateState.setCall!.featuredAt).toBeInstanceOf(Date);

		await setFeatured('setup-1', false);
		expect(updateState.setCall!.featuredAt).toBeNull();
	});
});
