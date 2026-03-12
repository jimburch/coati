import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Mock $env/static/private
vi.mock('$env/static/private', () => ({
	GITHUB_CLIENT_ID: 'test-client-id',
	GITHUB_CLIENT_SECRET: 'test-client-secret'
}));

// Mock the database
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockFindFirst = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		insert: () => ({ values: (v: unknown) => ({ returning: () => mockInsert(v) }) }),
		delete: () => ({ where: (w: unknown) => mockDelete(w) }),
		update: () => ({ set: (s: unknown) => ({ where: (w: unknown) => mockUpdate(s, w) }) }),
		query: {
			sessions: { findFirst: (opts: unknown) => mockFindFirst(opts) },
			users: { findFirst: (opts: unknown) => mockFindFirst(opts) }
		}
	}
}));

vi.mock('$lib/server/db/schema', async () => {
	const actual = await vi.importActual('$lib/server/db/schema');
	return actual;
});

import { generateSessionToken, createSession, validateSessionToken, invalidateSession } from './auth';

describe('auth module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('generateSessionToken', () => {
		it('returns a 64-character hex string', () => {
			const token = generateSessionToken();
			expect(token).toMatch(/^[0-9a-f]{64}$/);
		});

		it('returns unique tokens on each call', () => {
			const t1 = generateSessionToken();
			const t2 = generateSessionToken();
			expect(t1).not.toBe(t2);
		});
	});

	describe('token hashing', () => {
		it('is deterministic — same token produces same hash', () => {
			const token = 'a'.repeat(64);
			const hash1 = crypto.createHash('sha256').update(token).digest('hex');
			const hash2 = crypto.createHash('sha256').update(token).digest('hex');
			expect(hash1).toBe(hash2);
		});
	});

	describe('createSession', () => {
		it('stores hashed ID, not raw token', async () => {
			const token = generateSessionToken();
			const hashedId = crypto.createHash('sha256').update(token).digest('hex');

			mockInsert.mockResolvedValueOnce([{ id: hashedId, userId: 'user-1', expiresAt: new Date() }]);

			await createSession(token, 'user-1');

			const insertedValues = mockInsert.mock.calls[0][0];
			expect(insertedValues.id).toBe(hashedId);
			expect(insertedValues.id).not.toBe(token);
		});

		it('sets expiry to ~30 days from now', async () => {
			const token = generateSessionToken();

			mockInsert.mockResolvedValueOnce([{ id: 'hashed', userId: 'user-1', expiresAt: new Date() }]);

			await createSession(token, 'user-1');

			const insertedValues = mockInsert.mock.calls[0][0];
			const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
			const diff = insertedValues.expiresAt.getTime() - Date.now();
			// Allow 5 seconds of tolerance
			expect(diff).toBeGreaterThan(thirtyDaysMs - 5000);
			expect(diff).toBeLessThanOrEqual(thirtyDaysMs);
		});
	});

	describe('validateSessionToken', () => {
		it('returns { session, user } for valid non-expired token', async () => {
			const token = generateSessionToken();
			const hashedId = crypto.createHash('sha256').update(token).digest('hex');
			const futureDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 days out

			mockFindFirst.mockResolvedValueOnce({
				id: hashedId,
				userId: 'user-1',
				expiresAt: futureDate,
				user: { id: 'user-1', username: 'testuser' }
			});

			const result = await validateSessionToken(token);
			expect(result).not.toBeNull();
			expect(result!.user.username).toBe('testuser');
			expect(result!.session.id).toBe(hashedId);
		});

		it('returns null for expired token', async () => {
			const token = generateSessionToken();
			const hashedId = crypto.createHash('sha256').update(token).digest('hex');
			const pastDate = new Date(Date.now() - 1000);

			mockFindFirst.mockResolvedValueOnce({
				id: hashedId,
				userId: 'user-1',
				expiresAt: pastDate,
				user: { id: 'user-1', username: 'testuser' }
			});
			mockDelete.mockResolvedValueOnce(undefined);

			const result = await validateSessionToken(token);
			expect(result).toBeNull();
		});

		it('returns null for unknown token', async () => {
			mockFindFirst.mockResolvedValueOnce(null);

			const result = await validateSessionToken('nonexistent-token');
			expect(result).toBeNull();
		});

		it('extends session when less than 15 days remaining (sliding window)', async () => {
			const token = generateSessionToken();
			const hashedId = crypto.createHash('sha256').update(token).digest('hex');
			// 10 days remaining — should trigger extension
			const nearExpiry = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

			mockFindFirst.mockResolvedValueOnce({
				id: hashedId,
				userId: 'user-1',
				expiresAt: nearExpiry,
				user: { id: 'user-1', username: 'testuser' }
			});
			mockUpdate.mockResolvedValueOnce(undefined);

			const result = await validateSessionToken(token);
			expect(result).not.toBeNull();
			// Should have called update to extend the session
			expect(mockUpdate).toHaveBeenCalledTimes(1);
		});

		it('does not extend session when more than 15 days remaining', async () => {
			const token = generateSessionToken();
			const hashedId = crypto.createHash('sha256').update(token).digest('hex');
			// 20 days remaining — should NOT trigger extension
			const farExpiry = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

			mockFindFirst.mockResolvedValueOnce({
				id: hashedId,
				userId: 'user-1',
				expiresAt: farExpiry,
				user: { id: 'user-1', username: 'testuser' }
			});

			await validateSessionToken(token);
			expect(mockUpdate).not.toHaveBeenCalled();
		});
	});

	describe('invalidateSession', () => {
		it('deletes the session from DB', async () => {
			mockDelete.mockResolvedValueOnce(undefined);
			await invalidateSession('session-id');
			expect(mockDelete).toHaveBeenCalledTimes(1);
		});
	});
});
