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

// -1 means no item highlighted; valid range is [0, total-1]
function getNextIndex(current: number, total: number): number {
	if (total === 0) return -1;
	if (current >= total - 1) return total - 1;
	return current + 1;
}

function getPrevIndex(current: number): number {
	if (current <= 0) return -1;
	return current - 1;
}

function resolveEnterAction(
	highlightedIndex: number,
	items: { ownerUsername: string; slug: string }[],
	query: string
): { type: 'result'; url: string } | { type: 'explore'; url: string } {
	if (highlightedIndex >= 0 && highlightedIndex < items.length) {
		const item = items[highlightedIndex];
		return { type: 'result', url: buildResultUrl(item.ownerUsername, item.slug) };
	}
	return { type: 'explore', url: buildExploreUrl(query) };
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

describe('getNextIndex', () => {
	it('returns -1 when total is 0', () => {
		expect(getNextIndex(-1, 0)).toBe(-1);
	});

	it('moves from -1 (no highlight) to 0 on first arrow down', () => {
		expect(getNextIndex(-1, 3)).toBe(0);
	});

	it('increments index', () => {
		expect(getNextIndex(0, 3)).toBe(1);
		expect(getNextIndex(1, 3)).toBe(2);
	});

	it('stops at last item (does not wrap)', () => {
		expect(getNextIndex(2, 3)).toBe(2);
		expect(getNextIndex(4, 5)).toBe(4);
	});
});

describe('getPrevIndex', () => {
	it('returns -1 when current is -1 (no highlight)', () => {
		expect(getPrevIndex(-1)).toBe(-1);
	});

	it('returns -1 when current is 0 (moves to no highlight)', () => {
		expect(getPrevIndex(0)).toBe(-1);
	});

	it('decrements index', () => {
		expect(getPrevIndex(2)).toBe(1);
		expect(getPrevIndex(1)).toBe(0);
	});
});

describe('resolveEnterAction', () => {
	const items = [
		{ ownerUsername: 'alice', slug: 'my-setup' },
		{ ownerUsername: 'bob', slug: 'other-setup' }
	];

	it('navigates to explore when no highlight (-1)', () => {
		const result = resolveEnterAction(-1, items, 'claude');
		expect(result).toEqual({ type: 'explore', url: '/explore?q=claude' });
	});

	it('navigates to explore when items is empty', () => {
		const result = resolveEnterAction(-1, [], 'claude');
		expect(result).toEqual({ type: 'explore', url: '/explore?q=claude' });
	});

	it('navigates to result when first item is highlighted', () => {
		const result = resolveEnterAction(0, items, 'alice');
		expect(result).toEqual({ type: 'result', url: '/alice/my-setup' });
	});

	it('navigates to correct result for second item', () => {
		const result = resolveEnterAction(1, items, 'alice');
		expect(result).toEqual({ type: 'result', url: '/bob/other-setup' });
	});

	it('falls back to explore when highlightedIndex is out of bounds', () => {
		const result = resolveEnterAction(5, items, 'query');
		expect(result).toEqual({ type: 'explore', url: '/explore?q=query' });
	});
});
