import { describe, it, expect } from 'vitest';

// Pure logic extracted from SearchDropdown.svelte

function shouldFetch(query: string): boolean {
	return query.trim().length >= 2;
}

function buildExploreUrl(query: string): string {
	const trimmed = query.trim();
	if (trimmed) {
		return `/explore?q=${encodeURIComponent(trimmed)}`;
	}
	return '/explore';
}

function buildResultUrl(username: string, slug: string): string {
	return `/${username}/${slug}`;
}

function sliceResults<T>(items: T[], max: number): T[] {
	return items.slice(0, max);
}

describe('shouldFetch', () => {
	it('returns false for empty string', () => {
		expect(shouldFetch('')).toBe(false);
	});

	it('returns false for single character', () => {
		expect(shouldFetch('a')).toBe(false);
	});

	it('returns false for whitespace-only', () => {
		expect(shouldFetch('  ')).toBe(false);
	});

	it('returns false for one real character with spaces', () => {
		expect(shouldFetch(' a ')).toBe(false);
	});

	it('returns true for two characters', () => {
		expect(shouldFetch('ab')).toBe(true);
	});

	it('returns true for two characters with surrounding whitespace', () => {
		expect(shouldFetch('  ab  ')).toBe(true);
	});

	it('returns true for longer query', () => {
		expect(shouldFetch('claude code')).toBe(true);
	});
});

describe('buildExploreUrl', () => {
	it('returns /explore for empty string', () => {
		expect(buildExploreUrl('')).toBe('/explore');
	});

	it('returns /explore for whitespace-only', () => {
		expect(buildExploreUrl('   ')).toBe('/explore');
	});

	it('returns /explore?q=<query> for a simple query', () => {
		expect(buildExploreUrl('claude')).toBe('/explore?q=claude');
	});

	it('encodes spaces in the query', () => {
		expect(buildExploreUrl('claude code')).toBe('/explore?q=claude%20code');
	});

	it('trims whitespace before building URL', () => {
		expect(buildExploreUrl('  claude  ')).toBe('/explore?q=claude');
	});

	it('encodes special characters', () => {
		expect(buildExploreUrl('hello & world')).toBe('/explore?q=hello%20%26%20world');
	});
});

describe('buildResultUrl', () => {
	it('builds /username/slug URL', () => {
		expect(buildResultUrl('alice', 'my-setup')).toBe('/alice/my-setup');
	});

	it('handles different usernames and slugs', () => {
		expect(buildResultUrl('bob-dev', 'claude-hooks')).toBe('/bob-dev/claude-hooks');
	});
});

describe('sliceResults', () => {
	it('returns all items when fewer than max', () => {
		const items = [1, 2, 3];
		expect(sliceResults(items, 5)).toEqual([1, 2, 3]);
	});

	it('returns exactly max items when more are available', () => {
		const items = [1, 2, 3, 4, 5, 6, 7];
		expect(sliceResults(items, 5)).toEqual([1, 2, 3, 4, 5]);
	});

	it('returns empty array when input is empty', () => {
		expect(sliceResults([], 5)).toEqual([]);
	});

	it('returns empty array when max is 0', () => {
		expect(sliceResults([1, 2, 3], 0)).toEqual([]);
	});
});
