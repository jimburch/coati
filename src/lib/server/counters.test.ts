import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock the schema import so Drizzle column references resolve without a real DB
vi.mock('$lib/server/db/schema', async () => {
	const actual = await vi.importActual('$lib/server/db/schema');
	return actual;
});

// counters.ts only uses injected `tx` — no db module import needed
import { counters } from './counters';

/** Build a chainable Drizzle-like tx mock */
function makeTx() {
	const mockWhere = vi.fn().mockResolvedValue(undefined);
	const mockSet = vi.fn(() => ({ where: mockWhere }));
	const mockUpdate = vi.fn(() => ({ set: mockSet }));
	return { tx: { update: mockUpdate } as never, mockUpdate, mockSet, mockWhere };
}

describe('counters', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// --- Cycle 1: setupCreated ---
	describe('setupCreated', () => {
		it('calls tx.update once', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.setupCreated(tx, 'user-1');
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('resolves without throwing', async () => {
			const { tx } = makeTx();
			await expect(counters.setupCreated(tx, 'user-1')).resolves.toBeUndefined();
		});
	});

	// --- Cycle 2: setupDeleted ---
	describe('setupDeleted', () => {
		it('calls tx.update once', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.setupDeleted(tx, 'user-1');
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('resolves without throwing', async () => {
			const { tx } = makeTx();
			await expect(counters.setupDeleted(tx, 'user-1')).resolves.toBeUndefined();
		});
	});

	// --- Cycle 3: cloneRecorded ---
	describe('cloneRecorded', () => {
		it('calls tx.update once', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.cloneRecorded(tx, 'setup-1');
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('resolves without throwing', async () => {
			const { tx } = makeTx();
			await expect(counters.cloneRecorded(tx, 'setup-1')).resolves.toBeUndefined();
		});
	});

	// --- Cycle 4: star ---
	describe('star', () => {
		it('calls tx.update once when adding a star', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.star(tx, 'setup-1', true);
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('calls tx.update once when removing a star', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.star(tx, 'setup-1', false);
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('resolves without throwing for both directions', async () => {
			const { tx } = makeTx();
			await expect(counters.star(tx, 'setup-1', true)).resolves.toBeUndefined();
			const { tx: tx2 } = makeTx();
			await expect(counters.star(tx2, 'setup-1', false)).resolves.toBeUndefined();
		});
	});

	// --- Cycle 5: follow ---
	describe('follow', () => {
		it('calls tx.update twice (followersCount + followingCount)', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.follow(tx, 'follower-1', 'followed-1', true);
			expect(mockUpdate).toHaveBeenCalledTimes(2);
		});

		it('calls tx.update twice when unfollowing', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.follow(tx, 'follower-1', 'followed-1', false);
			expect(mockUpdate).toHaveBeenCalledTimes(2);
		});

		it('resolves without throwing', async () => {
			const { tx } = makeTx();
			await expect(counters.follow(tx, 'follower-1', 'followed-1', true)).resolves.toBeUndefined();
		});
	});

	// --- Cycle 6: commentCreated ---
	describe('commentCreated', () => {
		it('calls tx.update once', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.commentCreated(tx, 'setup-1');
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('resolves without throwing', async () => {
			const { tx } = makeTx();
			await expect(counters.commentCreated(tx, 'setup-1')).resolves.toBeUndefined();
		});
	});

	// --- Cycle 7: commentsDeleted ---
	describe('commentsDeleted', () => {
		it('calls tx.update once', async () => {
			const { tx, mockUpdate } = makeTx();
			await counters.commentsDeleted(tx, 'setup-1', 3);
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('resolves without throwing for batch count', async () => {
			const { tx } = makeTx();
			await expect(counters.commentsDeleted(tx, 'setup-1', 5)).resolves.toBeUndefined();
		});
	});
});
