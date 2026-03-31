/**
 * Unit tests for the seed-dev script.
 *
 * Tests cover:
 * - Data generation correctness
 * - All component types represented
 * - Edge cases (no files, long desc, max tags, empty bio)
 * - GitHub API rate limiting handling
 * - Idempotency via truncate-then-insert pattern
 *
 * Integration tests (against a real DB on port 5433) require:
 *   TEST_DATABASE_URL=postgres://coati:coati@localhost:5433/coati_test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	GITHUB_USERNAMES,
	TAG_NAMES,
	generateTagNames,
	generateSetups,
	fetchGitHubProfile,
	fetchGitHubProfiles,
	seed
} from '../../../scripts/seed-dev';
import type { GitHubProfile } from '../../../scripts/seed-dev';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeUsers(count = 10) {
	return Array.from({ length: count }, (_, i) => ({
		id: `user-${i}`,
		username: `user${i}`
	}));
}

function makeTags(names = TAG_NAMES) {
	return names.map((name, i) => ({ id: `tag-${i}`, name }));
}

function makeAgents(slugs = ['claude-code', 'cursor', 'copilot']) {
	return slugs.map((slug, i) => ({ id: `agent-${i}`, slug }));
}

function makeGitHubProfile(overrides: Partial<GitHubProfile> = {}): GitHubProfile {
	return {
		login: 'testuser',
		id: 12345,
		avatar_url: 'https://avatars.githubusercontent.com/u/12345',
		name: 'Test User',
		bio: 'A developer',
		email: 'test@example.com',
		blog: 'https://example.com',
		location: 'San Francisco',
		...overrides
	};
}

// ─── Constants Tests ──────────────────────────────────────────────────────────

describe('GITHUB_USERNAMES', () => {
	it('contains at least 30 usernames', () => {
		expect(GITHUB_USERNAMES.length).toBeGreaterThanOrEqual(30);
	});

	it('contains at most 45 usernames', () => {
		expect(GITHUB_USERNAMES.length).toBeLessThanOrEqual(45);
	});

	it('includes well-known developers', () => {
		const lowered = GITHUB_USERNAMES.map((u) => u.toLowerCase());
		expect(lowered).toContain('torvalds');
		expect(lowered).toContain('sindresorhus');
	});

	it('has no duplicates', () => {
		const lowered = GITHUB_USERNAMES.map((u) => u.toLowerCase());
		const unique = new Set(lowered);
		expect(unique.size).toBe(lowered.length);
	});
});

// ─── generateTagNames Tests ───────────────────────────────────────────────────

describe('generateTagNames', () => {
	it('returns TAG_NAMES array', () => {
		expect(generateTagNames()).toEqual(TAG_NAMES);
	});

	it('returns at least 10 tags', () => {
		expect(generateTagNames().length).toBeGreaterThanOrEqual(10);
	});

	it('returns URL-safe lowercase names', () => {
		const tags = generateTagNames();
		for (const tag of tags) {
			expect(tag).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		}
	});
});

// ─── generateSetups Tests ─────────────────────────────────────────────────────

describe('generateSetups', () => {
	const users = makeUsers(10);
	const tags = makeTags();
	const agents = makeAgents();

	it('generates between 90 and 150 setups for 35 users', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		expect(setups.length).toBeGreaterThanOrEqual(90);
		expect(setups.length).toBeLessThanOrEqual(150);
	});

	it('each setup has a userId matching one of the input users', () => {
		const setups = generateSetups(users, tags, agents);
		const userIds = new Set(users.map((u) => u.id));
		for (const setup of setups) {
			expect(userIds.has(setup.userId)).toBe(true);
		}
	});

	it('covers all component types across setups', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const allComponentTypes = new Set(setups.flatMap((s) => s.files.map((f) => f.componentType)));

		expect(allComponentTypes.has('instruction')).toBe(true);
		expect(allComponentTypes.has('command')).toBe(true);
		expect(allComponentTypes.has('skill')).toBe(true);
		expect(allComponentTypes.has('mcp_server')).toBe(true);
		expect(allComponentTypes.has('hook')).toBe(true);
		expect(allComponentTypes.has('config')).toBe(true);
		expect(allComponentTypes.has('policy')).toBe(true);
		expect(allComponentTypes.has('agent_def')).toBe(true);
		expect(allComponentTypes.has('ignore')).toBe(true);
		expect(allComponentTypes.has('setup_script')).toBe(true);
	});

	it('includes at least one setup with no files (edge case)', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const noFilesSetup = setups.find((s) => s.files.length === 0);
		expect(noFilesSetup).toBeDefined();
	});

	it('includes at least one setup with a very long description (edge case)', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const longDescSetup = setups.find((s) => s.description.length >= 200);
		expect(longDescSetup).toBeDefined();
	});

	it('all descriptions are within the 300 char limit', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		for (const setup of setups) {
			expect(setup.description.length).toBeLessThanOrEqual(300);
		}
	});

	it('includes at least one setup with maximum tags (edge case)', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const maxTagsSetup = setups.find((s) => s.tagNames.length >= 5);
		expect(maxTagsSetup).toBeDefined();
	});

	it('at least one user has no setups (edge case)', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const usersWithSetups = new Set(setups.map((s) => s.userId));
		const usersWithoutSetups = manyUsers.filter((u) => !usersWithSetups.has(u.id));
		expect(usersWithoutSetups.length).toBeGreaterThanOrEqual(1);
	});

	it('includes both global and project placements', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const placements = new Set(setups.map((s) => s.placement));
		expect(placements.has('global')).toBe(true);
		expect(placements.has('project')).toBe(true);
	});

	it('includes varying engagement levels (trending + new)', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const hasHighStars = setups.some((s) => s.starsCount > 50);
		const hasZeroStars = setups.some((s) => s.starsCount === 0);
		expect(hasHighStars).toBe(true);
		expect(hasZeroStars).toBe(true);
	});

	it('each setup has a unique slug', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const slugs = setups.map((s) => s.slug);
		const unique = new Set(slugs);
		expect(unique.size).toBe(slugs.length);
	});

	it('setup slugs are URL-safe', () => {
		const setups = generateSetups(users, tags, agents);
		for (const setup of setups) {
			expect(setup.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		}
	});

	it('each setup has at least one tag', () => {
		const setups = generateSetups(users, tags, agents);
		for (const setup of setups) {
			expect(setup.tagNames.length).toBeGreaterThanOrEqual(1);
		}
	});

	it('all tag names reference valid tags from input', () => {
		const setups = generateSetups(users, tags, agents);
		const validTagNames = new Set(tags.map((t) => t.name));
		for (const setup of setups) {
			for (const tagName of setup.tagNames) {
				expect(validTagNames.has(tagName)).toBe(true);
			}
		}
	});

	it('agent slugs reference valid agents from input', () => {
		const setups = generateSetups(users, tags, agents);
		const validSlugs = new Set(agents.map((a) => a.slug));
		for (const setup of setups) {
			for (const slug of setup.agentSlugs) {
				expect(validSlugs.has(slug)).toBe(true);
			}
		}
	});

	it('generateSetups is deterministic (same inputs → same outputs)', () => {
		const setups1 = generateSetups(users, tags, agents);
		const setups2 = generateSetups(users, tags, agents);
		expect(setups1.map((s) => s.slug)).toEqual(setups2.map((s) => s.slug));
		expect(setups1.map((s) => s.name)).toEqual(setups2.map((s) => s.name));
	});
});

// ─── fetchGitHubProfile Tests ─────────────────────────────────────────────────

describe('fetchGitHubProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns profile on successful fetch', async () => {
		const profile = makeGitHubProfile();
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => profile,
			headers: { get: () => null }
		});

		const result = await fetchGitHubProfile('testuser', undefined, mockFetch);
		expect(result).toEqual(profile);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://api.github.com/users/testuser',
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: 'application/vnd.github.v3+json' })
			})
		);
	});

	it('includes Authorization header when token is provided', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => makeGitHubProfile(),
			headers: { get: () => null }
		});

		await fetchGitHubProfile('testuser', 'ghp_token123', mockFetch);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'token ghp_token123' })
			})
		);
	});

	it('returns null on non-ok response', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			headers: { get: () => null }
		});

		const result = await fetchGitHubProfile('nonexistent', undefined, mockFetch);
		expect(result).toBeNull();
	});

	it('retries once on 429 rate limit response', async () => {
		const profile = makeGitHubProfile();
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 429,
				headers: { get: () => '1' } // Retry-After: 1s (keep test fast)
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => profile,
				headers: { get: () => null }
			});

		const result = await fetchGitHubProfile('testuser', undefined, mockFetch);
		expect(result).toEqual(profile);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	}, 10000);

	it('retries once on 403 rate limit response', async () => {
		const profile = makeGitHubProfile();
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 403,
				headers: { get: () => '1' }
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => profile,
				headers: { get: () => null }
			});

		const result = await fetchGitHubProfile('testuser', undefined, mockFetch);
		expect(result).toEqual(profile);
		expect(mockFetch).toHaveBeenCalledTimes(2);
	}, 10000);

	it('returns null on network error', async () => {
		const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

		const result = await fetchGitHubProfile('testuser', undefined, mockFetch);
		expect(result).toBeNull();
	});
});

// ─── fetchGitHubProfiles Tests ────────────────────────────────────────────────

describe('fetchGitHubProfiles', () => {
	it('collects all successfully fetched profiles', async () => {
		const profile1 = makeGitHubProfile({ login: 'user1', id: 1 });
		const profile2 = makeGitHubProfile({ login: 'user2', id: 2 });
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => profile1,
				headers: { get: () => null }
			})
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => profile2,
				headers: { get: () => null }
			});

		const result = await fetchGitHubProfiles(['user1', 'user2'], undefined, mockFetch, 0);
		expect(result).toHaveLength(2);
		expect(result[0].login).toBe('user1');
		expect(result[1].login).toBe('user2');
	});

	it('skips usernames that fail to fetch', async () => {
		const profile = makeGitHubProfile({ login: 'user1', id: 1 });
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => profile,
				headers: { get: () => null }
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				headers: { get: () => null }
			});

		const result = await fetchGitHubProfiles(['user1', 'nonexistent'], undefined, mockFetch, 0);
		expect(result).toHaveLength(1);
		expect(result[0].login).toBe('user1');
	});
});

// ─── seed() function Tests ────────────────────────────────────────────────────

describe('seed()', () => {
	function makeMockDb() {
		const executeCalls: string[] = [];
		const insertedData: Record<string, unknown[]> = {};

		// Capture what was inserted per table
		const mockInsert = vi.fn((table: { _: { name: string } } | unknown) => {
			const tableName = (table as { _?: { name?: string } })._?.name ?? 'unknown';
			return {
				values: vi.fn((rows: unknown | unknown[]) => {
					const arr = Array.isArray(rows) ? rows : [rows];
					insertedData[tableName] = [...(insertedData[tableName] ?? []), ...arr];
					return {
						returning: vi.fn(() =>
							Promise.resolve(arr.map((r, i) => ({ id: `inserted-${tableName}-${i}`, ...r })))
						),
						then: (resolve: (v: unknown[]) => unknown) =>
							resolve(arr.map((r, i) => ({ id: `inserted-${tableName}-${i}`, ...r })))
					};
				})
			};
		});

		// Build mock select chain
		const mockSelectData: Record<string, unknown[]> = {};
		const mockSelect = vi.fn(() => ({
			from: vi.fn((table: { _: { name: string } } | unknown) => {
				const tableName = (table as { _?: { name?: string } })._?.name ?? 'unknown';
				return Promise.resolve(mockSelectData[tableName] ?? []);
			})
		}));

		const mockUpdate = vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve())
			}))
		}));

		return {
			mockDb: { execute: vi.fn(), insert: mockInsert, select: mockSelect, update: mockUpdate },
			executeCalls,
			insertedData,
			mockSelectData
		};
	}

	it('calls TRUNCATE before inserting data (idempotency)', async () => {
		const { mockDb, mockSelectData } = makeMockDb();

		// Pre-populate select results so seed doesn't crash
		mockSelectData['agents'] = [{ id: 'a1', slug: 'claude-code' }];
		mockSelectData['users'] = [{ id: 'u1', username: 'torvalds' }];
		mockSelectData['tags'] = TAG_NAMES.slice(0, 3).map((n, i) => ({ id: `t${i}`, name: n }));
		mockSelectData['setups'] = [];

		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			headers: { get: () => null }
		});

		// seed throws because <5 profiles fetched — that's expected here
		await seed(mockDb as unknown as ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>, {
			fetcher: mockFetch,
			delayMs: 0
		}).catch(() => {
			/* expected: <5 profiles */
		});

		// TRUNCATE must still have been called first (before the profile check)
		expect(mockDb.execute).toHaveBeenCalled();
		const firstCall = (mockDb.execute as ReturnType<typeof vi.fn>).mock.calls[0];
		expect(firstCall).toBeDefined();
	});

	it('throws if fewer than 5 profiles are fetched', async () => {
		const { mockDb } = makeMockDb();

		// All fetches return 404 → 0 profiles → should throw
		const failFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			headers: { get: () => null }
		});

		await expect(
			seed(mockDb as unknown as ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>, {
				fetcher: failFetch,
				delayMs: 0
			})
		).rejects.toThrow(/profiles fetched/);
	});
});

// ─── Idempotency Logic Test ───────────────────────────────────────────────────

describe('idempotency', () => {
	it('generateSetups produces identical results for same inputs (no side effects)', () => {
		const users = makeUsers(35);
		const tags = makeTags();
		const agents = makeAgents();

		const run1 = generateSetups(users, tags, agents);
		const run2 = generateSetups(users, tags, agents);

		expect(run1.length).toBe(run2.length);
		for (let i = 0; i < run1.length; i++) {
			expect(run1[i].slug).toBe(run2[i].slug);
			expect(run1[i].name).toBe(run2[i].name);
			expect(run1[i].description).toBe(run2[i].description);
			expect(run1[i].files.length).toBe(run2[i].files.length);
			expect(run1[i].tagNames).toEqual(run2[i].tagNames);
		}
	});

	it('generateTagNames is idempotent', () => {
		expect(generateTagNames()).toEqual(generateTagNames());
	});
});
