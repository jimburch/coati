import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

// Capture SQL strings and values for assertions
const capturedSql = vi.hoisted(() => ({ queries: [] as string[], values: [] as unknown[][] }));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		capturedSql.queries.push(strings.join('__'));
		capturedSql.values.push(values);
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

describe('searchSetups — tag prefix matching', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedSql.queries = [];
		capturedSql.values = [];
		mockExecute
			.mockResolvedValueOnce([]) // items query result
			.mockResolvedValueOnce([{ count: '0' }]); // count query result
	});

	it('includes tag ILIKE condition with prefix pattern when q is "python"', async () => {
		await searchSetups({ q: 'python', sort: 'newest', page: 1 });

		// All values passed to sql template literals
		const allValues = capturedSql.values.flat();
		expect(allValues).toContain('python%');
	});

	it('includes tag ILIKE prefix for partial query "type" (prefix match for "typescript")', async () => {
		await searchSetups({ q: 'type', sort: 'newest', page: 1 });

		const allValues = capturedSql.values.flat();
		expect(allValues).toContain('type%');
	});

	it('ILIKE param uses the raw trimmed query value (case preserved as entered)', async () => {
		await searchSetups({ q: '  Python  ', sort: 'newest', page: 1 });

		const allValues = capturedSql.values.flat();
		// The tag ILIKE param should be trimmed + '%'
		expect(allValues).toContain('Python%');
	});

	it('does not include tag ILIKE condition when q is absent', async () => {
		await searchSetups({ sort: 'newest', page: 1 });

		const allValues = capturedSql.values.flat();
		const tagLikeValues = allValues.filter(
			(v) => typeof v === 'string' && (v as string).endsWith('%') && !(v as string).startsWith('%')
		);
		expect(tagLikeValues).toHaveLength(0);
	});

	it('includes searchVector tsquery and name ILIKE conditions when q is provided', async () => {
		await searchSetups({ q: 'python', sort: 'newest', page: 1 });

		const allValues = capturedSql.values.flat();
		// prefixQuery for tsquery ends with :*
		expect(allValues).toContain('python:*');
		// name ILIKE uses %q% pattern
		expect(allValues).toContain('%python%');
	});

	it('does not include tag ILIKE condition when q is empty string', async () => {
		await searchSetups({ q: '', sort: 'newest', page: 1 });

		const allValues = capturedSql.values.flat();
		const tagLikeValues = allValues.filter(
			(v) => typeof v === 'string' && (v as string).endsWith('%') && !(v as string).startsWith('%')
		);
		expect(tagLikeValues).toHaveLength(0);
	});

	it('tagName parameter no longer exists on the searchSetups type', () => {
		// Verify at runtime that searchSetups works fine without tagName
		// (the type no longer accepts it — verified by TypeScript compilation)
		expect(() => searchSetups({ q: 'python', sort: 'newest', page: 1 })).not.toThrow();
	});
});
