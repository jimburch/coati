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
	it('requires at least 2 non-whitespace characters', () => {
		expect(shouldFetch('')).toBe(false);
		expect(shouldFetch('a')).toBe(false);
		expect(shouldFetch('  ')).toBe(false);
		expect(shouldFetch(' a ')).toBe(false);
		expect(shouldFetch('ab')).toBe(true);
		expect(shouldFetch('  ab  ')).toBe(true);
		expect(shouldFetch('claude code')).toBe(true);
	});
});

describe('URL builders', () => {
	it('buildExploreUrl: trims, URL-encodes, and falls back to /explore for empty query', () => {
		expect(buildExploreUrl('')).toBe('/explore');
		expect(buildExploreUrl('   ')).toBe('/explore');
		expect(buildExploreUrl('claude')).toBe('/explore?q=claude');
		expect(buildExploreUrl('  claude  ')).toBe('/explore?q=claude');
		expect(buildExploreUrl('claude code')).toBe('/explore?q=claude%20code');
		expect(buildExploreUrl('hello & world')).toBe('/explore?q=hello%20%26%20world');
	});

	it('buildResultUrl: /<username>/<slug>', () => {
		expect(buildResultUrl('alice', 'my-setup')).toBe('/alice/my-setup');
		expect(buildResultUrl('bob-dev', 'claude-hooks')).toBe('/bob-dev/claude-hooks');
	});
});

describe('sliceResults', () => {
	it('limits to max items, handling empty input and zero max', () => {
		expect(sliceResults([1, 2, 3], 5)).toEqual([1, 2, 3]);
		expect(sliceResults([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([1, 2, 3, 4, 5]);
		expect(sliceResults([], 5)).toEqual([]);
		expect(sliceResults([1, 2, 3], 0)).toEqual([]);
	});
});

describe('keyboard navigation (getNextIndex / getPrevIndex)', () => {
	it('getNextIndex: returns -1 for empty list, advances otherwise, clamps at last item', () => {
		expect(getNextIndex(-1, 0)).toBe(-1);
		expect(getNextIndex(-1, 3)).toBe(0);
		expect(getNextIndex(0, 3)).toBe(1);
		expect(getNextIndex(1, 3)).toBe(2);
		expect(getNextIndex(2, 3)).toBe(2);
		expect(getNextIndex(4, 5)).toBe(4);
	});

	it('getPrevIndex: decrements, returns -1 from 0 (no highlight), stays -1 below 0', () => {
		expect(getPrevIndex(-1)).toBe(-1);
		expect(getPrevIndex(0)).toBe(-1);
		expect(getPrevIndex(1)).toBe(0);
		expect(getPrevIndex(2)).toBe(1);
	});
});

describe('resolveEnterAction', () => {
	const items = [
		{ ownerUsername: 'alice', slug: 'my-setup' },
		{ ownerUsername: 'bob', slug: 'other-setup' }
	];

	it('routes to a result when a valid item is highlighted, otherwise to explore', () => {
		expect(resolveEnterAction(0, items, 'alice')).toEqual({
			type: 'result',
			url: '/alice/my-setup'
		});
		expect(resolveEnterAction(1, items, 'alice')).toEqual({
			type: 'result',
			url: '/bob/other-setup'
		});
		expect(resolveEnterAction(-1, items, 'claude')).toEqual({
			type: 'explore',
			url: '/explore?q=claude'
		});
		expect(resolveEnterAction(-1, [], 'claude')).toEqual({
			type: 'explore',
			url: '/explore?q=claude'
		});
		expect(resolveEnterAction(5, items, 'query')).toEqual({
			type: 'explore',
			url: '/explore?q=query'
		});
	});
});
