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

vi.mock('$app/environment', () => ({ dev: true }));

// Mock global fetch for upsertGithubUser tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
	generateSessionToken,
	createSession,
	validateSessionToken,
	invalidateSession,
	invalidateAllUserSessions,
	setSessionCookie,
	deleteSessionCookie,
	getSessionToken,
	upsertGithubUser
} from './auth';

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

	describe('invalidateAllUserSessions', () => {
		it('deletes all sessions for a given user', async () => {
			mockDelete.mockResolvedValueOnce(undefined);
			await invalidateAllUserSessions('user-1');
			expect(mockDelete).toHaveBeenCalledTimes(1);
		});
	});

	describe('cookie helpers', () => {
		function makeCookies() {
			const store = new Map<string, string>();
			const lastSetCall: { name?: string; value?: string; opts?: Record<string, unknown> } = {};
			return {
				store,
				lastSetCall,
				get: (name: string) => store.get(name),
				set: (name: string, value: string, opts: Record<string, unknown>) => {
					store.set(name, value);
					lastSetCall.name = name;
					lastSetCall.value = value;
					lastSetCall.opts = opts;
				}
			};
		}

		it('setSessionCookie sets cookie with correct name and options', () => {
			const cookies = makeCookies();
			setSessionCookie(cookies as never, 'my-token');
			expect(cookies.lastSetCall.name).toBe('magpie_session');
			expect(cookies.lastSetCall.value).toBe('my-token');
			expect(cookies.lastSetCall.opts?.httpOnly).toBe(true);
			expect(cookies.lastSetCall.opts?.sameSite).toBe('lax');
			expect(cookies.lastSetCall.opts?.path).toBe('/');
			expect(cookies.lastSetCall.opts?.maxAge as number).toBeGreaterThan(0);
		});

		it('deleteSessionCookie sets maxAge to 0', () => {
			const cookies = makeCookies();
			deleteSessionCookie(cookies as never);
			expect(cookies.lastSetCall.name).toBe('magpie_session');
			expect(cookies.lastSetCall.value).toBe('');
			expect(cookies.lastSetCall.opts?.maxAge).toBe(0);
		});

		it('getSessionToken returns token from cookie', () => {
			const cookies = makeCookies();
			cookies.store.set('magpie_session', 'stored-token');
			expect(getSessionToken(cookies as never)).toBe('stored-token');
		});

		it('getSessionToken returns undefined when no cookie', () => {
			const cookies = makeCookies();
			expect(getSessionToken(cookies as never)).toBeUndefined();
		});
	});

	describe('upsertGithubUser', () => {
		const ghUser: {
			id: number;
			login: string;
			email: string | null;
			avatar_url: string;
			bio: string;
			blog: string;
		} = {
			id: 12345,
			login: 'octocat',
			email: 'octocat@github.com',
			avatar_url: 'https://avatar.url',
			bio: 'Hello',
			blog: 'https://blog.url'
		};
		const ghEmails = [
			{ email: 'primary@example.com', primary: true, verified: true },
			{ email: 'other@example.com', primary: false, verified: true }
		];

		function mockGitHubApi(user = ghUser, emails = ghEmails) {
			mockFetch.mockImplementation((url: string) => {
				if (url.includes('/user/emails')) {
					return Promise.resolve({ ok: true, json: () => Promise.resolve(emails) });
				}
				return Promise.resolve({ ok: true, json: () => Promise.resolve(user) });
			});
		}

		it('creates new user when no existing user found', async () => {
			mockGitHubApi();
			mockFindFirst.mockResolvedValueOnce(null); // no existing user
			mockInsert.mockResolvedValueOnce([{ id: 'new-user-id' }]);

			const userId = await upsertGithubUser('gh-access-token');
			expect(userId).toBe('new-user-id');
			expect(mockInsert).toHaveBeenCalledTimes(1);
			const inserted = mockInsert.mock.calls[0][0];
			expect(inserted.githubId).toBe(12345);
			expect(inserted.username).toBe('octocat');
		});

		it('updates existing user and returns their ID', async () => {
			mockGitHubApi();
			mockFindFirst.mockResolvedValueOnce({ id: 'existing-id', bio: 'old bio', websiteUrl: null });
			mockUpdate.mockResolvedValueOnce(undefined);

			const userId = await upsertGithubUser('gh-access-token');
			expect(userId).toBe('existing-id');
			expect(mockUpdate).toHaveBeenCalledTimes(1);
			expect(mockInsert).not.toHaveBeenCalled();
		});

		it('falls back to primary verified email when user.email is null', async () => {
			mockGitHubApi({ ...ghUser, email: null });
			mockFindFirst.mockResolvedValueOnce(null);
			mockInsert.mockResolvedValueOnce([{ id: 'new-id' }]);

			await upsertGithubUser('gh-access-token');
			const inserted = mockInsert.mock.calls[0][0];
			expect(inserted.email).toBe('primary@example.com');
		});

		it('throws when no email is available', async () => {
			mockGitHubApi({ ...ghUser, email: null }, []);
			await expect(upsertGithubUser('gh-access-token')).rejects.toThrow('No email found');
		});

		it('throws on GitHub API error', async () => {
			mockFetch.mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
			await expect(upsertGithubUser('bad-token')).rejects.toThrow('GitHub API error: 401');
		});
	});
});
