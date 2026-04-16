import { describe, it, expect } from 'vitest';
import { isReservedUsername, sanitizeUsername, RESERVED_USERNAMES } from './username';

describe('isReservedUsername', () => {
	it('returns true for reserved names', () => {
		expect(isReservedUsername('admin')).toBe(true);
		expect(isReservedUsername('api')).toBe(true);
		expect(isReservedUsername('explore')).toBe(true);
		expect(isReservedUsername('settings')).toBe(true);
		expect(isReservedUsername('team')).toBe(true);
		expect(isReservedUsername('invite')).toBe(true);
		expect(isReservedUsername('new')).toBe(true);
		expect(isReservedUsername('feed')).toBe(true);
		expect(isReservedUsername('auth')).toBe(true);
		expect(isReservedUsername('org')).toBe(true);
	});

	it('is case-insensitive', () => {
		expect(isReservedUsername('Admin')).toBe(true);
		expect(isReservedUsername('API')).toBe(true);
		expect(isReservedUsername('EXPLORE')).toBe(true);
	});

	it('returns false for normal usernames', () => {
		expect(isReservedUsername('jimburch')).toBe(false);
		expect(isReservedUsername('alice')).toBe(false);
		expect(isReservedUsername('johndoe123')).toBe(false);
	});

	it('returns false for names that contain but do not equal reserved words', () => {
		expect(isReservedUsername('adminuser')).toBe(false);
		expect(isReservedUsername('myteam')).toBe(false);
		expect(isReservedUsername('explorer')).toBe(false);
	});
});

describe('sanitizeUsername', () => {
	it('returns the lowercased username unchanged when not reserved', () => {
		expect(sanitizeUsername('Alice', 12345)).toBe('alice');
		expect(sanitizeUsername('jimburch', 99)).toBe('jimburch');
	});

	it('appends the github id when username is reserved', () => {
		expect(sanitizeUsername('admin', 42)).toBe('admin42');
		expect(sanitizeUsername('api', 1234)).toBe('api1234');
		expect(sanitizeUsername('explore', 9999)).toBe('explore9999');
	});

	it('handles uppercase reserved names by lowercasing and appending id', () => {
		expect(sanitizeUsername('Admin', 7)).toBe('admin7');
		expect(sanitizeUsername('TEAM', 500)).toBe('team500');
	});
});

describe('RESERVED_USERNAMES', () => {
	it('is a Set containing key route names', () => {
		expect(RESERVED_USERNAMES).toBeInstanceOf(Set);
		const required = [
			'org',
			'api',
			'explore',
			'admin',
			'settings',
			'team',
			'invite',
			'new',
			'feed',
			'auth'
		];
		for (const name of required) {
			expect(RESERVED_USERNAMES.has(name)).toBe(true);
		}
	});
});
