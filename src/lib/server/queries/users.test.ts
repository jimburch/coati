import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b }))
}));

vi.mock('$lib/server/db/schema', () => ({
	users: {
		id: 'users.id',
		username: 'users.username',
		email: 'users.email',
		avatarUrl: 'users.avatarUrl',
		name: 'users.name',
		bio: 'users.bio',
		websiteUrl: 'users.websiteUrl',
		location: 'users.location',
		githubUsername: 'users.githubUsername',
		setupsCount: 'users.setupsCount',
		followersCount: 'users.followersCount',
		followingCount: 'users.followingCount',
		createdAt: 'users.createdAt',
		updatedAt: 'users.updatedAt',
		isAdmin: 'users.isAdmin'
	}
}));

const mockSet = vi.fn();
const mockWhere = vi.fn();

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	chain['select'] = vi.fn(() => chain);
	chain['from'] = vi.fn(() => chain);
	chain['where'] = vi.fn((...args: unknown[]) => {
		mockWhere(...args);
		return chain;
	});
	chain['limit'] = vi.fn(() => Promise.resolve(state.rows));
	chain['update'] = vi.fn(() => chain);
	chain['set'] = vi.fn((...args: unknown[]) => {
		mockSet(...args);
		return chain;
	});
	chain['returning'] = vi.fn(() => Promise.resolve(state.rows));
	return { db: chain };
});

import { getUserByUsername, getUserById, updateUserProfile } from './users';

describe('getUserByUsername', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when user not found', async () => {
		state.rows = [];
		const result = await getUserByUsername('nonexistent');
		expect(result).toBeNull();
	});

	it('returns user including name and location', async () => {
		state.rows = [
			{
				id: 'user-1',
				username: 'alice',
				avatarUrl: 'https://example.com/alice.png',
				name: 'Alice Smith',
				bio: 'Developer',
				websiteUrl: 'https://alice.dev',
				location: 'San Francisco',
				githubUsername: 'alice',
				setupsCount: 3,
				followersCount: 10,
				followingCount: 5,
				createdAt: new Date('2026-01-01')
			}
		];
		const result = await getUserByUsername('alice');
		expect(result).not.toBeNull();
		expect(result?.name).toBe('Alice Smith');
		expect(result?.location).toBe('San Francisco');
	});
});

describe('getUserById', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
	});

	it('returns null when user not found', async () => {
		state.rows = [];
		const result = await getUserById('nonexistent-id');
		expect(result).toBeNull();
	});

	it('returns user with email and all profile fields', async () => {
		state.rows = [
			{
				id: 'user-1',
				username: 'alice',
				email: 'alice@example.com',
				avatarUrl: 'https://example.com/alice.png',
				name: 'Alice Smith',
				bio: 'Developer',
				websiteUrl: 'https://alice.dev',
				location: 'San Francisco',
				githubUsername: 'alice',
				setupsCount: 3,
				followersCount: 10,
				followingCount: 5,
				isAdmin: false,
				createdAt: new Date('2026-01-01'),
				updatedAt: new Date('2026-01-02')
			}
		];
		const result = await getUserById('user-1');
		expect(result).not.toBeNull();
		expect(result?.email).toBe('alice@example.com');
		expect(result?.name).toBe('Alice Smith');
		expect(result?.location).toBe('San Francisco');
	});
});

describe('updateUserProfile', () => {
	beforeEach(() => {
		state.rows = [];
		vi.clearAllMocks();
		mockSet.mockClear();
	});

	it('returns null when user not found', async () => {
		state.rows = [];
		const result = await updateUserProfile('user-1', { name: 'Alice' });
		expect(result).toBeNull();
	});

	it('returns updated user on success', async () => {
		state.rows = [
			{
				id: 'user-1',
				username: 'alice',
				email: 'alice@example.com',
				name: 'Alice Updated',
				bio: null,
				websiteUrl: null,
				location: null
			}
		];
		const result = await updateUserProfile('user-1', { name: 'Alice Updated' });
		expect(result).not.toBeNull();
		expect(result?.name).toBe('Alice Updated');
	});

	it('converts empty string name to null', async () => {
		state.rows = [{ id: 'user-1', name: null }];
		await updateUserProfile('user-1', { name: '' });
		expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ name: null }));
	});

	it('converts empty string bio to null', async () => {
		state.rows = [{ id: 'user-1', bio: null }];
		await updateUserProfile('user-1', { bio: '' });
		expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ bio: null }));
	});

	it('converts empty string websiteUrl to null', async () => {
		state.rows = [{ id: 'user-1', websiteUrl: null }];
		await updateUserProfile('user-1', { websiteUrl: '' });
		expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ websiteUrl: null }));
	});

	it('converts empty string location to null', async () => {
		state.rows = [{ id: 'user-1', location: null }];
		await updateUserProfile('user-1', { location: '' });
		expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ location: null }));
	});

	it('keeps non-empty strings as-is', async () => {
		state.rows = [{ id: 'user-1', location: 'NYC' }];
		await updateUserProfile('user-1', { location: 'NYC' });
		expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ location: 'NYC' }));
	});
});
