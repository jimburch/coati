import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockLimit, mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
	const mockLimit = vi.fn();
	const mockWhere = vi.fn(() => ({ limit: mockLimit }));
	const mockFrom = vi.fn(() => ({ where: mockWhere }));
	const mockSelect = vi.fn(() => ({ from: mockFrom }));
	return { mockLimit, mockWhere, mockFrom, mockSelect };
});

vi.mock('$lib/server/db', () => ({
	db: { select: mockSelect }
}));

import { searchUsers, buildUserSearchPattern } from '../users';

describe('buildUserSearchPattern', () => {
	it('appends % for prefix match', () => {
		expect(buildUserSearchPattern('alice')).toBe('alice%');
	});

	it('lowercases the query for case insensitivity', () => {
		expect(buildUserSearchPattern('ALICE')).toBe('alice%');
	});

	it('lowercases mixed case', () => {
		expect(buildUserSearchPattern('AlIcE')).toBe('alice%');
	});

	it('trims leading and trailing whitespace', () => {
		expect(buildUserSearchPattern('  bob  ')).toBe('bob%');
	});

	it('returns just % for empty string', () => {
		expect(buildUserSearchPattern('')).toBe('%');
	});

	it('handles single character prefix', () => {
		expect(buildUserSearchPattern('a')).toBe('a%');
	});
});

describe('searchUsers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockWhere.mockReturnValue({ limit: mockLimit });
		mockFrom.mockReturnValue({ where: mockWhere });
		mockSelect.mockReturnValue({ from: mockFrom });
	});

	it('returns users from db', async () => {
		const mockUsers = [
			{
				id: '1',
				username: 'alice',
				name: 'Alice',
				avatarUrl: 'https://example.com/a.png',
				setupsCount: 2
			}
		];
		mockLimit.mockResolvedValue(mockUsers);

		const result = await searchUsers('al');
		expect(result).toEqual(mockUsers);
	});

	it('enforces default limit of 3', async () => {
		mockLimit.mockResolvedValue([]);

		await searchUsers('al');
		expect(mockLimit).toHaveBeenCalledWith(3);
	});

	it('enforces custom limit', async () => {
		mockLimit.mockResolvedValue([]);

		await searchUsers('al', 5);
		expect(mockLimit).toHaveBeenCalledWith(5);
	});

	it('returns empty array when no users match', async () => {
		mockLimit.mockResolvedValue([]);

		const result = await searchUsers('xyz');
		expect(result).toEqual([]);
	});

	it('queries from users table and applies where clause', async () => {
		mockLimit.mockResolvedValue([]);

		await searchUsers('al');
		expect(mockFrom).toHaveBeenCalled();
		expect(mockWhere).toHaveBeenCalled();
	});

	it('selects correct fields', async () => {
		mockLimit.mockResolvedValue([]);

		await searchUsers('al');
		const selectedFields = (mockSelect.mock.calls as unknown[][])[0][0];
		expect(selectedFields).toHaveProperty('id');
		expect(selectedFields).toHaveProperty('username');
		expect(selectedFields).toHaveProperty('name');
		expect(selectedFields).toHaveProperty('avatarUrl');
		expect(selectedFields).toHaveProperty('setupsCount');
	});
});
