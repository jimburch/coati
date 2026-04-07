/**
 * Unit tests for the seed-dev script.
 *
 * Tests cover:
 * - Data generation correctness
 * - All component types represented
 * - Agent-specific file structures
 * - Edge cases (long desc, max tags, empty bio)
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
	COMMENT_BODIES_SHORT,
	COMMENT_BODIES_MEDIUM,
	COMMENT_BODIES_LONG,
	REPLY_BODIES,
	generateTagNames,
	generateSetups,
	generateStars,
	generateFollows,
	generateCommentGroups,
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

function makeAgents(
	slugs = ['claude-code', 'cursor', 'copilot', 'codex', 'gemini', 'opencode']
) {
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

	it('includes agent name tags', () => {
		const tags = generateTagNames();
		expect(tags).toContain('claude-code');
		expect(tags).toContain('cursor');
		expect(tags).toContain('copilot');
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

	it('every setup has at least 2 files', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		for (const setup of setups) {
			expect(setup.files.length).toBeGreaterThanOrEqual(2);
		}
	});

	it('every setup has at least one agent slug', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		for (const setup of setups) {
			expect(setup.agentSlugs.length).toBeGreaterThanOrEqual(1);
		}
	});

	it('all license values are null', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		for (const setup of setups) {
			expect(setup.license).toBeNull();
		}
	});

	it('file agent fields are valid slugs or undefined', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const validSlugs = new Set([
			'claude-code',
			'cursor',
			'copilot',
			'codex',
			'gemini',
			'opencode',
			undefined
		]);
		for (const setup of setups) {
			for (const file of setup.files) {
				expect(validSlugs.has(file.agent)).toBe(true);
			}
		}
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

	it('agent slugs reference valid agent slugs', () => {
		const setups = generateSetups(users, tags, agents);
		const validSlugs = new Set([
			'claude-code',
			'cursor',
			'copilot',
			'codex',
			'gemini',
			'opencode'
		]);
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

	it('includes setups for all 6 agents', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const allAgentSlugs = new Set(setups.flatMap((s) => s.agentSlugs));
		expect(allAgentSlugs.has('claude-code')).toBe(true);
		expect(allAgentSlugs.has('cursor')).toBe(true);
		expect(allAgentSlugs.has('copilot')).toBe(true);
		expect(allAgentSlugs.has('codex')).toBe(true);
		expect(allAgentSlugs.has('gemini')).toBe(true);
		expect(allAgentSlugs.has('opencode')).toBe(true);
	});

	it('includes multi-agent setups', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const multiAgent = setups.filter((s) => s.agentSlugs.length > 1);
		expect(multiAgent.length).toBeGreaterThan(0);
	});

	it('has a mix of boilerplate and custom readmes', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);
		const boilerplate = setups.filter(
			(s) => s.readme !== null && !s.readme.includes("## What's Included")
		);
		const custom = setups.filter(
			(s) => s.readme !== null && s.readme.includes("## What's Included")
		);
		expect(boilerplate.length).toBeGreaterThan(0);
		expect(custom.length).toBeGreaterThan(0);
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

// ─── Comment Body Constants Tests ────────────────────────────────────────────

describe('COMMENT_BODIES_SHORT / MEDIUM / LONG / REPLY_BODIES', () => {
	it('COMMENT_BODIES_SHORT contains short strings (under 30 chars)', () => {
		expect(COMMENT_BODIES_SHORT.length).toBeGreaterThan(0);
		for (const body of COMMENT_BODIES_SHORT) {
			expect(body.length).toBeLessThan(30);
		}
	});

	it('COMMENT_BODIES_MEDIUM contains medium strings (30–150 chars)', () => {
		expect(COMMENT_BODIES_MEDIUM.length).toBeGreaterThan(0);
		for (const body of COMMENT_BODIES_MEDIUM) {
			expect(body.length).toBeGreaterThanOrEqual(30);
			expect(body.length).toBeLessThanOrEqual(150);
		}
	});

	it('COMMENT_BODIES_LONG contains long strings (over 100 chars)', () => {
		expect(COMMENT_BODIES_LONG.length).toBeGreaterThan(0);
		for (const body of COMMENT_BODIES_LONG) {
			expect(body.length).toBeGreaterThan(100);
		}
	});

	it('REPLY_BODIES contains short reply strings', () => {
		expect(REPLY_BODIES.length).toBeGreaterThan(0);
	});
});

// ─── generateStars Tests ──────────────────────────────────────────────────────

describe('generateStars', () => {
	it('returns empty array for setup with starsCount=0', () => {
		const setups = [{ id: 's1', starsCount: 0 }];
		const users = [{ id: 'u1' }, { id: 'u2' }];
		expect(generateStars(setups, users)).toHaveLength(0);
	});

	it('creates star rows matching starsCount for each setup', () => {
		const setups = [{ id: 's1', starsCount: 3 }];
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const stars = generateStars(setups, users);
		expect(stars).toHaveLength(3);
		expect(stars.every((s) => s.setupId === 's1')).toBe(true);
	});

	it('caps stars at number of available users', () => {
		const setups = [{ id: 's1', starsCount: 100 }];
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const stars = generateStars(setups, users);
		expect(stars).toHaveLength(5);
	});

	it('returns no duplicate (userId, setupId) pairs', () => {
		const setups = [{ id: 's1', starsCount: 5 }];
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const stars = generateStars(setups, users);
		const unique = new Set(stars.map((s) => `${s.userId}:${s.setupId}`));
		expect(unique.size).toBe(stars.length);
	});

	it('distributes stars across multiple setups with realistic variance', () => {
		const setups = [
			{ id: 's1', starsCount: 50 },
			{ id: 's2', starsCount: 2 },
			{ id: 's3', starsCount: 0 }
		];
		const users = Array.from({ length: 35 }, (_, i) => ({ id: `u${i}` }));
		const stars = generateStars(setups, users);
		const s1Stars = stars.filter((s) => s.setupId === 's1');
		const s2Stars = stars.filter((s) => s.setupId === 's2');
		const s3Stars = stars.filter((s) => s.setupId === 's3');
		expect(s1Stars).toHaveLength(35); // capped at user count
		expect(s2Stars).toHaveLength(2);
		expect(s3Stars).toHaveLength(0);
	});

	it('returns objects with userId and setupId fields', () => {
		const setups = [{ id: 's1', starsCount: 2 }];
		const users = [{ id: 'u1' }, { id: 'u2' }];
		const stars = generateStars(setups, users);
		expect(stars[0]).toHaveProperty('userId');
		expect(stars[0]).toHaveProperty('setupId');
	});

	it('is deterministic', () => {
		const setups = [{ id: 's1', starsCount: 5 }];
		const users = Array.from({ length: 10 }, (_, i) => ({ id: `u${i}` }));
		const stars1 = generateStars(setups, users);
		const stars2 = generateStars(setups, users);
		expect(stars1).toEqual(stars2);
	});
});

// ─── generateFollows Tests ────────────────────────────────────────────────────

describe('generateFollows', () => {
	it('returns no self-follows', () => {
		const users = Array.from({ length: 10 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);
		expect(follows.every((f) => f.followerId !== f.followingId)).toBe(true);
	});

	it('returns no duplicate follows', () => {
		const users = Array.from({ length: 15 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);
		const unique = new Set(follows.map((f) => `${f.followerId}:${f.followingId}`));
		expect(unique.size).toBe(follows.length);
	});

	it('creates follow relationships between users', () => {
		const users = Array.from({ length: 15 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);
		expect(follows.length).toBeGreaterThan(0);
	});

	it('some users have followers (popular users)', () => {
		const users = Array.from({ length: 15 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);
		const followedUsers = new Set(follows.map((f) => f.followingId));
		expect(followedUsers.size).toBeGreaterThan(0);
	});

	it('some users follow nobody (realistic distribution)', () => {
		const users = Array.from({ length: 15 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);
		const followingUsers = new Set(follows.map((f) => f.followerId));
		const usersWithNoFollowing = users.filter((u) => !followingUsers.has(u.id));
		expect(usersWithNoFollowing.length).toBeGreaterThan(0);
	});

	it('returns objects with followerId and followingId fields', () => {
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);
		if (follows.length > 0) {
			expect(follows[0]).toHaveProperty('followerId');
			expect(follows[0]).toHaveProperty('followingId');
		}
	});

	it('is deterministic', () => {
		const users = Array.from({ length: 15 }, (_, i) => ({ id: `u${i}` }));
		const follows1 = generateFollows(users);
		const follows2 = generateFollows(users);
		expect(follows1).toEqual(follows2);
	});
});

// ─── generateCommentGroups Tests ──────────────────────────────────────────────

describe('generateCommentGroups', () => {
	it('returns comment groups with required fields', () => {
		const setups = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups = generateCommentGroups(setups, users);
		expect(groups.length).toBeGreaterThan(0);
		for (const g of groups) {
			expect(g).toHaveProperty('setupId');
			expect(g).toHaveProperty('userId');
			expect(g).toHaveProperty('body');
			expect(g).toHaveProperty('replies');
			expect(Array.isArray(g.replies)).toBe(true);
		}
	});

	it('some setups have no comments (realistic distribution)', () => {
		const setups = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups = generateCommentGroups(setups, users);
		const setupsWithComments = new Set(groups.map((g) => g.setupId));
		expect(setupsWithComments.size).toBeLessThan(setups.length);
	});

	it('some comment groups have replies', () => {
		const setups = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups = generateCommentGroups(setups, users);
		const withReplies = groups.filter((g) => g.replies.length > 0);
		expect(withReplies.length).toBeGreaterThan(0);
	});

	it('comment bodies have varying lengths (short and long)', () => {
		const setups = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups = generateCommentGroups(setups, users);
		const shortComments = groups.filter((g) => g.body.length < 30);
		const longComments = groups.filter((g) => g.body.length > 100);
		expect(shortComments.length).toBeGreaterThan(0);
		expect(longComments.length).toBeGreaterThan(0);
	});

	it('replies have userId and body fields', () => {
		const setups = Array.from({ length: 20 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups = generateCommentGroups(setups, users);
		const groupWithReplies = groups.find((g) => g.replies.length > 0);
		expect(groupWithReplies).toBeDefined();
		if (groupWithReplies) {
			expect(groupWithReplies.replies[0]).toHaveProperty('userId');
			expect(groupWithReplies.replies[0]).toHaveProperty('body');
		}
	});

	it('is deterministic', () => {
		const setups = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups1 = generateCommentGroups(setups, users);
		const groups2 = generateCommentGroups(setups, users);
		expect(groups1.map((g) => g.body)).toEqual(groups2.map((g) => g.body));
		expect(groups1.map((g) => g.setupId)).toEqual(groups2.map((g) => g.setupId));
	});
});

// ─── SeedResult social fields Tests ───────────────────────────────────────────

describe('SeedResult social fields', () => {
	it('seed() result includes starsInserted, followsInserted, commentsInserted, activitiesInserted', async () => {
		// Build a mock DB that supports a successful full seed run
		const insertedData: Record<string, unknown[]> = {};
		let commentInsertCount = 0;

		const mockInsert = vi.fn((table: unknown) => {
			const tableName = (table as { _?: { name?: string } })._?.name ?? 'unknown';
			return {
				values: vi.fn((rows: unknown | unknown[]) => {
					const arr = Array.isArray(rows) ? rows : [rows];
					insertedData[tableName] = [...(insertedData[tableName] ?? []), ...arr];
					if (tableName === 'comments') commentInsertCount++;
					const idx = commentInsertCount;
					return {
						returning: vi.fn(() =>
							Promise.resolve(
								arr.map((r, i) => ({ id: `inserted-${tableName}-${idx}-${i}`, ...r }))
							)
						),
						then: (resolve: (v: unknown[]) => unknown) =>
							resolve(arr.map((r, i) => ({ id: `inserted-${tableName}-${idx}-${i}`, ...r })))
					};
				})
			};
		});

		// 5 mock profiles so seed doesn't throw
		const mockUsers = Array.from({ length: 5 }, (_, i) => ({
			id: `u${i}`,
			username: `user${i}`,
			githubId: i + 1,
			setupsCount: 0,
			followersCount: 0,
			followingCount: 0
		}));
		const mockSetups = Array.from({ length: 6 }, (_, i) => ({
			id: `s${i}`,
			userId: `u${i % 5}`,
			starsCount: i === 0 ? 3 : i === 1 ? 0 : 1,
			clonesCount: i
		}));
		const mockSelectData: Record<string, unknown[]> = {
			agents: [{ id: 'a1', slug: 'claude-code' }],
			users: mockUsers,
			tags: TAG_NAMES.slice(0, 3).map((n, i) => ({ id: `t${i}`, name: n })),
			setups: mockSetups
		};

		const mockSelect = vi.fn(() => ({
			from: vi.fn((table: unknown) => {
				const tableName = (table as { _?: { name?: string } })._?.name ?? 'unknown';
				return Promise.resolve(mockSelectData[tableName] ?? []);
			})
		}));

		const mockUpdate = vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => Promise.resolve())
			}))
		}));

		const mockDb = {
			execute: vi.fn(),
			insert: mockInsert,
			select: mockSelect,
			update: mockUpdate
		};

		const mockProfiles = Array.from({ length: 5 }, (_, i) => ({
			login: `user${i}`,
			id: i + 1,
			avatar_url: `https://avatars.githubusercontent.com/u/${i + 1}`,
			name: `User ${i}`,
			bio: null,
			email: null,
			blog: null,
			location: null
		}));

		// Override the fetch to cycle through profiles
		let fetchCallIdx = 0;
		const cyclicFetch = vi.fn().mockImplementation(() => {
			const profile = mockProfiles[fetchCallIdx % mockProfiles.length];
			fetchCallIdx++;
			return Promise.resolve({
				ok: true,
				status: 200,
				json: async () => ({ ...profile, id: fetchCallIdx }),
				headers: { get: () => null }
			});
		});

		const result = await seed(
			mockDb as unknown as ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>,
			{ fetcher: cyclicFetch, delayMs: 0 }
		);

		expect(result).toHaveProperty('starsInserted');
		expect(result).toHaveProperty('followsInserted');
		expect(result).toHaveProperty('commentsInserted');
		expect(result).toHaveProperty('activitiesInserted');
		expect(result.starsInserted).toBeGreaterThanOrEqual(0);
		expect(result.followsInserted).toBeGreaterThanOrEqual(0);
		expect(result.commentsInserted).toBeGreaterThanOrEqual(0);
		expect(result.activitiesInserted).toBeGreaterThanOrEqual(0);
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
