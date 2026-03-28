import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		select: (...args: unknown[]) => mockSelect(...args),
		update: (...args: unknown[]) => mockUpdate(...args)
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	users: { id: 'id', username: 'username', email: 'email', isBetaApproved: 'is_beta_approved' },
	feedbackSubmissions: { id: 'id', userId: 'user_id' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a, b) => ({ type: 'eq', a, b })),
	ilike: vi.fn((col, pattern) => ({ type: 'ilike', col, pattern })),
	count: vi.fn((col) => ({ type: 'count', col }))
}));

const SAMPLE_USERS = [
	{
		id: 'user-1',
		username: 'alice',
		email: 'alice@example.com',
		avatarUrl: 'https://example.com/alice.jpg',
		githubUsername: 'alice',
		isAdmin: false,
		isBetaApproved: true,
		lastLoginAt: new Date('2026-03-01'),
		createdAt: new Date('2026-01-01'),
		feedbackCount: 3
	},
	{
		id: 'user-2',
		username: 'bob',
		email: 'bob@example.com',
		avatarUrl: 'https://example.com/bob.jpg',
		githubUsername: 'bob',
		isAdmin: false,
		isBetaApproved: false,
		lastLoginAt: null,
		createdAt: new Date('2026-01-15'),
		feedbackCount: 0
	}
];

function makeChain(result: unknown) {
	const chain: Record<string, unknown> = {};
	chain.from = vi.fn().mockReturnValue(chain);
	chain.leftJoin = vi.fn().mockReturnValue(chain);
	chain.groupBy = vi.fn().mockReturnValue(chain);
	chain.orderBy = vi.fn().mockReturnValue(chain);
	chain.where = vi.fn().mockResolvedValue(result);
	// Make the chain itself thenable so awaiting it works when .where is not called
	chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);
	return chain;
}

function makeUpdateChain() {
	const chain: Record<string, unknown> = {};
	chain.set = vi.fn().mockReturnValue(chain);
	chain.where = vi.fn().mockResolvedValue(undefined);
	return chain;
}

describe('getAllUsersWithFeedbackCount', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns all users with feedback count when no search', async () => {
		const chain = makeChain(SAMPLE_USERS);
		mockSelect.mockReturnValue(chain);

		const { getAllUsersWithFeedbackCount } = await import('./admin');
		const result = await getAllUsersWithFeedbackCount();

		expect(result).toEqual(SAMPLE_USERS);
		expect(chain.from).toHaveBeenCalled();
		expect(chain.leftJoin).toHaveBeenCalled();
		expect(chain.groupBy).toHaveBeenCalled();
		expect(chain.orderBy).toHaveBeenCalled();
		expect(chain.where).not.toHaveBeenCalled();
	});

	it('filters by username when search param provided', async () => {
		const filtered = [SAMPLE_USERS[0]];
		const chain = makeChain(filtered);
		mockSelect.mockReturnValue(chain);

		const { getAllUsersWithFeedbackCount } = await import('./admin');
		const result = await getAllUsersWithFeedbackCount('alice');

		expect(chain.where).toHaveBeenCalled();
		expect(result).toEqual(filtered);
	});

	it('does not call .where when search is empty string', async () => {
		const chain = makeChain(SAMPLE_USERS);
		mockSelect.mockReturnValue(chain);

		const { getAllUsersWithFeedbackCount } = await import('./admin');
		await getAllUsersWithFeedbackCount('');

		expect(chain.where).not.toHaveBeenCalled();
	});

	it('returns empty array when no users match search', async () => {
		const chain = makeChain([]);
		mockSelect.mockReturnValue(chain);

		const { getAllUsersWithFeedbackCount } = await import('./admin');
		const result = await getAllUsersWithFeedbackCount('zzz-nonexistent');

		expect(result).toEqual([]);
	});
});

describe('setUserBetaApproval', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls db.update with correct approval value (approve)', async () => {
		const chain = makeUpdateChain();
		mockUpdate.mockReturnValue(chain);

		const { setUserBetaApproval } = await import('./admin');
		await setUserBetaApproval('user-1', true);

		expect(mockUpdate).toHaveBeenCalled();
		expect(chain.set).toHaveBeenCalledWith({ isBetaApproved: true });
		expect(chain.where).toHaveBeenCalled();
	});

	it('calls db.update with correct approval value (revoke)', async () => {
		const chain = makeUpdateChain();
		mockUpdate.mockReturnValue(chain);

		const { setUserBetaApproval } = await import('./admin');
		await setUserBetaApproval('user-2', false);

		expect(mockUpdate).toHaveBeenCalled();
		expect(chain.set).toHaveBeenCalledWith({ isBetaApproved: false });
		expect(chain.where).toHaveBeenCalled();
	});
});
