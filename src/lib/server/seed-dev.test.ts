/**
 * Unit tests for the seed-dev script.
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
	resolveSeedUsernames,
	generateTeams,
	generateTeamMemberships,
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

function makeAgents(slugs = ['claude-code', 'cursor', 'copilot', 'codex', 'gemini', 'opencode']) {
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

// ─── Constants ────────────────────────────────────────────────────────────────

describe('seed constants (GITHUB_USERNAMES, TAG_NAMES, COMMENT_BODIES_*)', () => {
	it('GITHUB_USERNAMES: 30–45 unique entries, includes well-known devs', () => {
		expect(GITHUB_USERNAMES.length).toBeGreaterThanOrEqual(30);
		expect(GITHUB_USERNAMES.length).toBeLessThanOrEqual(45);
		const lowered = GITHUB_USERNAMES.map((u) => u.toLowerCase());
		expect(lowered).toContain('torvalds');
		expect(lowered).toContain('sindresorhus');
		expect(new Set(lowered).size).toBe(lowered.length);
	});

	it('generateTagNames: returns ≥10 URL-safe tags including agent names', () => {
		const tags = generateTagNames();
		expect(tags).toEqual(TAG_NAMES);
		expect(tags.length).toBeGreaterThanOrEqual(10);
		for (const tag of tags) {
			expect(tag).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		}
		for (const slug of ['claude-code', 'cursor', 'copilot']) {
			expect(tags).toContain(slug);
		}
	});

	it('COMMENT_BODIES_*: each tier respects its length bucket and is non-empty', () => {
		expect(COMMENT_BODIES_SHORT.length).toBeGreaterThan(0);
		for (const body of COMMENT_BODIES_SHORT) expect(body.length).toBeLessThan(30);

		expect(COMMENT_BODIES_MEDIUM.length).toBeGreaterThan(0);
		for (const body of COMMENT_BODIES_MEDIUM) {
			expect(body.length).toBeGreaterThanOrEqual(30);
			expect(body.length).toBeLessThanOrEqual(150);
		}

		expect(COMMENT_BODIES_LONG.length).toBeGreaterThan(0);
		for (const body of COMMENT_BODIES_LONG) expect(body.length).toBeGreaterThan(100);

		expect(REPLY_BODIES.length).toBeGreaterThan(0);
	});
});

// ─── generateSetups ───────────────────────────────────────────────────────────

describe('generateSetups', () => {
	const users = makeUsers(10);
	const tags = makeTags();
	const agents = makeAgents();

	it('generates a realistic setup fleet with correct shape and valid references', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);

		// Size bucket (35 users → 90–150 setups)
		expect(setups.length).toBeGreaterThanOrEqual(90);
		expect(setups.length).toBeLessThanOrEqual(150);

		const userIds = new Set(manyUsers.map((u) => u.id));
		const validTagNames = new Set(tags.map((t) => t.name));
		const validSlugs = new Set(['claude-code', 'cursor', 'copilot', 'codex', 'gemini', 'opencode']);

		const slugs = new Set<string>();
		for (const setup of setups) {
			expect(userIds.has(setup.userId)).toBe(true);
			expect(setup.files.length).toBeGreaterThanOrEqual(2);
			expect(setup.agentSlugs.length).toBeGreaterThanOrEqual(1);
			expect(setup.license).toBeNull();
			expect(setup.description.length).toBeLessThanOrEqual(300);
			expect(setup.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
			expect(setup.tagNames.length).toBeGreaterThanOrEqual(1);
			slugs.add(setup.slug);

			for (const tagName of setup.tagNames) expect(validTagNames.has(tagName)).toBe(true);
			for (const slug of setup.agentSlugs) expect(validSlugs.has(slug)).toBe(true);
			for (const file of setup.files) {
				expect(new Set([...validSlugs, undefined]).has(file.agent)).toBe(true);
			}
		}
		expect(slugs.size).toBe(setups.length);
	});

	it('covers every componentType and every agent across the fleet', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);

		const componentTypes: Set<string> = new Set(
			setups.flatMap((s) => s.files.map((f) => f.componentType as string))
		);
		for (const ct of [
			'instruction',
			'command',
			'skill',
			'mcp_server',
			'hook',
			'config',
			'policy',
			'agent_def',
			'ignore',
			'setup_script'
		]) {
			expect(componentTypes.has(ct)).toBe(true);
		}

		const agentSlugs = new Set(setups.flatMap((s) => s.agentSlugs));
		for (const slug of ['claude-code', 'cursor', 'copilot', 'codex', 'gemini', 'opencode']) {
			expect(agentSlugs.has(slug)).toBe(true);
		}

		expect(setups.some((s) => s.agentSlugs.length > 1)).toBe(true);
	});

	it('includes realistic edge cases (long desc, max tags, orphan users, varied engagement, boilerplate/custom readmes)', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);

		expect(setups.find((s) => s.description.length >= 200)).toBeDefined();
		expect(setups.find((s) => s.tagNames.length >= 5)).toBeDefined();

		const usersWithSetups = new Set(setups.map((s) => s.userId));
		expect(manyUsers.filter((u) => !usersWithSetups.has(u.id)).length).toBeGreaterThanOrEqual(1);

		expect(setups.some((s) => s.starsCount > 50)).toBe(true);
		expect(setups.some((s) => s.starsCount === 0)).toBe(true);

		const boilerplate = setups.filter(
			(s) => s.readme !== null && !s.readme.includes("## What's Included")
		);
		const custom = setups.filter(
			(s) => s.readme !== null && s.readme.includes("## What's Included")
		);
		expect(boilerplate.length).toBeGreaterThan(0);
		expect(custom.length).toBeGreaterThan(0);
	});

	it('is deterministic (same inputs → same outputs)', () => {
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
		expect(generateTagNames()).toEqual(generateTagNames());
	});

	it('every non-null README includes the Clone on Coati badge markdown', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);

		const withReadme = setups.filter((s) => s.readme !== null);
		expect(withReadme.length).toBeGreaterThan(0);

		for (const setup of withReadme) {
			expect(setup.readme).toContain('[![Clone on Coati]');
			expect(setup.readme).toContain('https://coati.sh/');
			expect(setup.readme).toContain('/badge.svg');
		}
	});

	it('includes the four primary launch-reference setups with correct badge READMEs', () => {
		const manyUsers = makeUsers(35);
		const setups = generateSetups(manyUsers, tags, agents);

		// Primary setups are assigned to user0 when no jimburch user is present
		const primaryOwnerUsername = 'user0';
		const primarySlugs = [
			'fullstack-claude',
			'minimalist',
			'mcp-power-user',
			'typescript-fullstack-starter'
		];

		for (const slug of primarySlugs) {
			const found = setups.find((s) => s.slug === slug);
			expect(found, `primary setup ${slug} missing from fleet`).toBeDefined();
			expect(found!.readme).not.toBeNull();
			expect(found!.readme).toContain('[![Clone on Coati]');
			expect(found!.readme).toContain(`https://coati.sh/${primaryOwnerUsername}/${slug}/badge.svg`);
		}
	});

	it('primary setup with jimburch uses jimburch in badge URL', () => {
		const usersWithJimburch = [
			...makeUsers(5),
			{ id: 'jimburch-id', username: 'jimburch' },
			{ id: 'last-user', username: 'lastuser' } // this one gets no setups
		];
		const setups = generateSetups(usersWithJimburch, tags, agents);

		const fullstack = setups.find((s) => s.slug === 'fullstack-claude');
		expect(fullstack).toBeDefined();
		expect(fullstack!.readme).toContain('https://coati.sh/jimburch/fullstack-claude/badge.svg');
	});
});

// ─── fetchGitHubProfile / fetchGitHubProfiles ────────────────────────────────

describe('fetchGitHubProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns profile on 200, forwards auth token, returns null on failure/network error', async () => {
		const profile = makeGitHubProfile();

		// 200 OK, no token
		const okFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => profile,
			headers: { get: () => null }
		});
		expect(await fetchGitHubProfile('testuser', undefined, okFetch)).toEqual(profile);
		expect(okFetch).toHaveBeenCalledWith(
			'https://api.github.com/users/testuser',
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: 'application/vnd.github.v3+json' })
			})
		);

		// Token propagates as Authorization header
		const tokenFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => profile,
			headers: { get: () => null }
		});
		await fetchGitHubProfile('testuser', 'ghp_token123', tokenFetch);
		expect(tokenFetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'token ghp_token123' })
			})
		);

		// Non-ok response (404) → null
		const notFoundFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			headers: { get: () => null }
		});
		expect(await fetchGitHubProfile('nonexistent', undefined, notFoundFetch)).toBeNull();

		// Network error → null
		const errorFetch = vi.fn().mockRejectedValue(new Error('Network error'));
		expect(await fetchGitHubProfile('testuser', undefined, errorFetch)).toBeNull();
	});

	it('retries exactly once on rate-limit responses (429 or 403)', async () => {
		for (const status of [429, 403]) {
			const profile = makeGitHubProfile();
			const mockFetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: false,
					status,
					headers: { get: () => '1' } // Retry-After: 1s — keep test fast
				})
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					json: async () => profile,
					headers: { get: () => null }
				});
			expect(await fetchGitHubProfile('testuser', undefined, mockFetch)).toEqual(profile);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		}
	}, 10000);
});

describe('fetchGitHubProfiles', () => {
	it('collects successful profiles and skips failed ones', async () => {
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
		const ok = await fetchGitHubProfiles(['user1', 'user2'], undefined, mockFetch, 0);
		expect(ok).toHaveLength(2);
		expect(ok.map((p) => p.login)).toEqual(['user1', 'user2']);

		const mixedFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => profile1,
				headers: { get: () => null }
			})
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				headers: { get: () => null }
			});
		const mixed = await fetchGitHubProfiles(['user1', 'nonexistent'], undefined, mixedFetch, 0);
		expect(mixed).toHaveLength(1);
		expect(mixed[0].login).toBe('user1');
	});
});

// ─── seed() ───────────────────────────────────────────────────────────────────

describe('seed()', () => {
	function makeMockDb() {
		const insertedData: Record<string, unknown[]> = {};

		const mockInsert = vi.fn((table: unknown) => {
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

		const mockSelectData: Record<string, unknown[]> = {};
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

		return {
			mockDb: { execute: vi.fn(), insert: mockInsert, select: mockSelect, update: mockUpdate },
			insertedData,
			mockSelectData
		};
	}

	it('runs TRUNCATE first (idempotency) and throws when fewer than 5 profiles are fetched', async () => {
		const { mockDb, mockSelectData } = makeMockDb();
		mockSelectData['agents'] = [{ id: 'a1', slug: 'claude-code' }];
		mockSelectData['users'] = [{ id: 'u1', username: 'torvalds' }];
		mockSelectData['tags'] = TAG_NAMES.slice(0, 3).map((n, i) => ({ id: `t${i}`, name: n }));
		mockSelectData['setups'] = [];

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

		// TRUNCATE ran before the profile count check
		expect(mockDb.execute).toHaveBeenCalled();
	});

	it('returns social counts (stars/follows/comments/activities) after a full run', async () => {
		let commentInsertCount = 0;
		const insertedData: Record<string, unknown[]> = {};

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

		const counts = result as unknown as Record<string, number>;
		for (const field of [
			'starsInserted',
			'followsInserted',
			'commentsInserted',
			'activitiesInserted'
		]) {
			expect(result).toHaveProperty(field);
			expect(counts[field]).toBeGreaterThanOrEqual(0);
		}
	});
});

// ─── generateStars / generateFollows / generateCommentGroups ─────────────────

describe('generateStars', () => {
	it('caps at user count, avoids duplicate pairs, scales per-setup, and is deterministic', () => {
		// Empty for starsCount=0
		expect(generateStars([{ id: 's1', starsCount: 0 }], [{ id: 'u1' }, { id: 'u2' }])).toHaveLength(
			0
		);

		// Matches starsCount and all rows reference the setup
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const three = generateStars([{ id: 's1', starsCount: 3 }], users);
		expect(three).toHaveLength(3);
		expect(three.every((s) => s.setupId === 's1')).toBe(true);
		expect(three[0]).toHaveProperty('userId');
		expect(three[0]).toHaveProperty('setupId');

		// Caps at user count
		expect(generateStars([{ id: 's1', starsCount: 100 }], users)).toHaveLength(5);

		// No duplicate (userId, setupId) pairs
		const five = generateStars([{ id: 's1', starsCount: 5 }], users);
		expect(new Set(five.map((s) => `${s.userId}:${s.setupId}`)).size).toBe(five.length);

		// Cross-setup distribution with capping
		const manyUsers = Array.from({ length: 35 }, (_, i) => ({ id: `u${i}` }));
		const multi = generateStars(
			[
				{ id: 's1', starsCount: 50 },
				{ id: 's2', starsCount: 2 },
				{ id: 's3', starsCount: 0 }
			],
			manyUsers
		);
		expect(multi.filter((s) => s.setupId === 's1')).toHaveLength(35);
		expect(multi.filter((s) => s.setupId === 's2')).toHaveLength(2);
		expect(multi.filter((s) => s.setupId === 's3')).toHaveLength(0);

		// Deterministic
		const usersDet = Array.from({ length: 10 }, (_, i) => ({ id: `u${i}` }));
		expect(generateStars([{ id: 's1', starsCount: 5 }], usersDet)).toEqual(
			generateStars([{ id: 's1', starsCount: 5 }], usersDet)
		);
	});
});

describe('generateFollows', () => {
	it('builds a realistic follower graph (no self-follows, no dupes, some orphan users, deterministic)', () => {
		const users = Array.from({ length: 15 }, (_, i) => ({ id: `u${i}` }));
		const follows = generateFollows(users);

		expect(follows.length).toBeGreaterThan(0);
		expect(follows.every((f) => f.followerId !== f.followingId)).toBe(true);

		const pairs = follows.map((f) => `${f.followerId}:${f.followingId}`);
		expect(new Set(pairs).size).toBe(pairs.length);

		const followed = new Set(follows.map((f) => f.followingId));
		expect(followed.size).toBeGreaterThan(0);

		const following = new Set(follows.map((f) => f.followerId));
		const orphans = users.filter((u) => !following.has(u.id));
		expect(orphans.length).toBeGreaterThan(0);

		// Shape
		expect(follows[0]).toHaveProperty('followerId');
		expect(follows[0]).toHaveProperty('followingId');

		// Deterministic
		expect(generateFollows(users)).toEqual(follows);
	});
});

describe('generateCommentGroups', () => {
	it('builds comment groups with replies, sparse setup coverage, and varied body lengths (deterministic)', () => {
		const setups = Array.from({ length: 40 }, (_, i) => ({ id: `s${i}` }));
		const users = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}` }));
		const groups = generateCommentGroups(setups, users);

		expect(groups.length).toBeGreaterThan(0);
		for (const g of groups) {
			expect(g).toHaveProperty('setupId');
			expect(g).toHaveProperty('userId');
			expect(g).toHaveProperty('body');
			expect(Array.isArray(g.replies)).toBe(true);
		}

		// Sparse: not every setup is commented on
		expect(new Set(groups.map((g) => g.setupId)).size).toBeLessThan(setups.length);

		// Varied body lengths
		expect(groups.filter((g) => g.body.length < 30).length).toBeGreaterThan(0);
		expect(groups.filter((g) => g.body.length > 100).length).toBeGreaterThan(0);

		// At least one group has replies with the expected shape
		const withReplies = groups.find((g) => g.replies.length > 0);
		expect(withReplies).toBeDefined();
		expect(withReplies!.replies[0]).toHaveProperty('userId');
		expect(withReplies!.replies[0]).toHaveProperty('body');

		// Deterministic
		const rerun = generateCommentGroups(setups, users);
		expect(rerun.map((g) => g.body)).toEqual(groups.map((g) => g.body));
		expect(rerun.map((g) => g.setupId)).toEqual(groups.map((g) => g.setupId));
	});
});

// ─── resolveSeedUsernames / generateTeams / generateTeamMemberships ──────────

describe('resolveSeedUsernames', () => {
	it('returns base unchanged for empty/whitespace/undefined owner; prepends otherwise; case-insensitive dedupe', () => {
		expect(resolveSeedUsernames(['alice', 'bob'], undefined)).toEqual(['alice', 'bob']);
		expect(resolveSeedUsernames(['alice'], '')).toEqual(['alice']);
		expect(resolveSeedUsernames(['alice'], '   ')).toEqual(['alice']);
		expect(resolveSeedUsernames(['alice', 'bob'], 'carol')).toEqual(['carol', 'alice', 'bob']);
		expect(resolveSeedUsernames(['Alice', 'bob'], 'alice')).toEqual(['alice', 'bob']);
	});
});

describe('generateTeams', () => {
	const users = Array.from({ length: 8 }, (_, i) => ({ id: `user-${i}` }));

	it('generates 3–5 teams with valid ownerIds and unique slugs', () => {
		const teams = generateTeams(users);
		expect(teams.length).toBeGreaterThanOrEqual(3);
		expect(teams.length).toBeLessThanOrEqual(5);

		const userIds = new Set(users.map((u) => u.id));
		for (const t of teams) expect(userIds.has(t.ownerId)).toBe(true);

		expect(new Set(teams.map((t) => t.slug)).size).toBe(teams.length);

		expect(generateTeams([])).toEqual([]);
	});

	it('honors ownerUserId when present and falls back to seedUsers[0] otherwise', () => {
		expect(generateTeams(users, 'user-5')[0].ownerId).toBe('user-5');
		expect(generateTeams(users, 'not-a-real-id')[0].ownerId).toBe('user-0');
	});
});

describe('generateTeamMemberships', () => {
	const users = Array.from({ length: 10 }, (_, i) => ({ id: `user-${i}` }));
	const teams = [
		{ id: 'team-0', ownerId: 'user-0' },
		{ id: 'team-1', ownerId: 'user-1' },
		{ id: 'team-2', ownerId: 'user-2' }
	];

	it('each team gets its owner as admin plus 2–5 unique member rows', () => {
		const memberships = generateTeamMemberships(teams, users);

		for (const t of teams) {
			const owner = memberships.find((m) => m.teamId === t.id && m.userId === t.ownerId);
			expect(owner).toBeDefined();
			expect(owner!.role).toBe('admin');

			const nonOwners = memberships.filter((m) => m.teamId === t.id && m.role === 'member');
			expect(nonOwners.length).toBeGreaterThanOrEqual(2);
			expect(nonOwners.length).toBeLessThanOrEqual(5);
		}

		// Uniqueness across all rows
		const seen = new Set<string>();
		for (const m of memberships) {
			const key = `${m.teamId}:${m.userId}`;
			expect(seen.has(key)).toBe(false);
			seen.add(key);
		}
	});

	it('adds ownerUserId to team[1] when missing, no-ops when already the admin', () => {
		const added = generateTeamMemberships(teams, users, 'user-5');
		expect(added.find((m) => m.teamId === 'team-1' && m.userId === 'user-5')).toBeDefined();

		const noDupe = generateTeamMemberships(teams, users, 'user-1');
		expect(noDupe.filter((m) => m.teamId === 'team-1' && m.userId === 'user-1')).toHaveLength(1);
	});
});
