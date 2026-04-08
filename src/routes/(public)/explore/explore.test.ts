import { describe, it, expect } from 'vitest';

// Pure logic extracted from explore/+page.svelte buildUrl function
// Tests URL construction for explore page filters and sort

type ExploreSort = 'trending' | 'stars' | 'newest';

interface ExploreState {
	q?: string;
	agents?: string[];
	sort: ExploreSort;
	page: number;
}

function buildUrl(
	current: ExploreState,
	overrides: {
		q?: string | undefined;
		agents?: string[] | undefined;
		sort?: string | undefined;
		page?: number | undefined;
	} = {}
): string {
	const merged = {
		q: 'q' in overrides ? overrides.q : current.q,
		agents: 'agents' in overrides ? overrides.agents : current.agents,
		sort: 'sort' in overrides ? overrides.sort : current.sort,
		page: 'page' in overrides ? overrides.page : current.page
	};

	const parts: string[] = [];
	if (merged.q) parts.push(`q=${encodeURIComponent(merged.q)}`);
	for (const slug of merged.agents ?? []) {
		parts.push(`agent=${encodeURIComponent(slug)}`);
	}
	if (merged.sort && merged.sort !== 'trending') parts.push(`sort=${merged.sort}`);
	if (merged.page && Number(merged.page) > 1) parts.push(`page=${String(merged.page)}`);

	return `/explore${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
}

// Pure logic extracted from explore/+page.server.ts load function
// Tests URL param parsing into explore state
function parseExploreParams(searchParams: URLSearchParams): Omit<ExploreState, 'sort'> & {
	sort: ExploreSort;
} {
	const VALID_SORTS: ExploreSort[] = ['trending', 'stars', 'newest'];
	const q = searchParams.get('q') || undefined;
	const agents = searchParams.getAll('agent').filter(Boolean);
	const sortParam = searchParams.get('sort') || 'trending';
	const sort: ExploreSort = VALID_SORTS.includes(sortParam as ExploreSort)
		? (sortParam as ExploreSort)
		: 'trending';
	const page = Math.max(1, Number(searchParams.get('page')) || 1);
	return { q, agents, sort, page };
}

const base: ExploreState = { sort: 'trending', page: 1 };

describe('buildUrl', () => {
	it('returns /explore with no params when state is default', () => {
		expect(buildUrl(base)).toBe('/explore');
	});

	it('includes q param when query is set', () => {
		expect(buildUrl(base, { q: 'claude' })).toBe('/explore?q=claude');
	});

	it('encodes spaces in q param', () => {
		expect(buildUrl(base, { q: 'hello world' })).toBe('/explore?q=hello%20world');
	});

	it('omits q param when q is undefined', () => {
		const current = { ...base, q: 'previous' };
		expect(buildUrl(current, { q: undefined })).toBe('/explore');
	});

	it('includes sort param for non-default sort', () => {
		expect(buildUrl(base, { sort: 'stars' })).toBe('/explore?sort=stars');
	});

	it('omits sort param when sort is trending (default)', () => {
		expect(buildUrl(base, { sort: 'trending' })).toBe('/explore');
	});

	it('includes page param when page > 1', () => {
		expect(buildUrl(base, { page: 2 })).toBe('/explore?page=2');
	});

	it('omits page param when page is 1', () => {
		expect(buildUrl(base, { page: 1 })).toBe('/explore');
	});

	it('omits page param when page is undefined', () => {
		expect(buildUrl({ ...base, page: 3 }, { page: undefined })).toBe('/explore');
	});

	it('includes single agent param', () => {
		expect(buildUrl(base, { agents: ['claude'] })).toBe('/explore?agent=claude');
	});

	it('includes multiple agent params', () => {
		const url = buildUrl(base, { agents: ['claude', 'cursor'] });
		expect(url).toBe('/explore?agent=claude&agent=cursor');
	});

	it('omits agent params when agents array is empty', () => {
		const current = { ...base, agents: ['claude'] };
		expect(buildUrl(current, { agents: [] })).toBe('/explore');
	});

	it('combines q and sort params correctly', () => {
		expect(buildUrl(base, { q: 'claude', sort: 'stars' })).toBe('/explore?q=claude&sort=stars');
	});

	it('combines q, agent, sort, and page params in correct order', () => {
		const url = buildUrl(base, { q: 'test', agents: ['claude'], sort: 'stars', page: 2 });
		expect(url).toBe('/explore?q=test&agent=claude&sort=stars&page=2');
	});

	it('uses current state values when no overrides provided', () => {
		const current: ExploreState = {
			q: 'existing',
			agents: ['claude'],
			sort: 'stars',
			page: 2
		};
		expect(buildUrl(current)).toBe('/explore?q=existing&agent=claude&sort=stars&page=2');
	});
});

// Pure logic: should user results row be shown
function shouldShowUserResults(q: string | undefined, userResults: { id: string }[]): boolean {
	return !!q && userResults.length > 0;
}

describe('shouldShowUserResults', () => {
	it('returns false when no query is active', () => {
		expect(shouldShowUserResults(undefined, [{ id: '1' }])).toBe(false);
	});

	it('returns false when query is present but no user results', () => {
		expect(shouldShowUserResults('alice', [])).toBe(false);
	});

	it('returns true when query is present and user results exist', () => {
		expect(shouldShowUserResults('alice', [{ id: '1' }])).toBe(true);
	});

	it('returns false when query is empty string (treated as undefined)', () => {
		expect(shouldShowUserResults(undefined, [{ id: '1' }, { id: '2' }])).toBe(false);
	});

	it('returns true with multiple user results', () => {
		const users = [{ id: '1' }, { id: '2' }, { id: '3' }];
		expect(shouldShowUserResults('bob', users)).toBe(true);
	});
});

describe('parseExploreParams (URL → state)', () => {
	it('returns default state for empty params', () => {
		const params = new URLSearchParams('');
		const result = parseExploreParams(params);
		expect(result.q).toBeUndefined();
		expect(result.agents).toEqual([]);
		expect(result.sort).toBe('trending');
		expect(result.page).toBe(1);
	});

	it('reads q param from URL', () => {
		const params = new URLSearchParams('q=claude');
		expect(parseExploreParams(params).q).toBe('claude');
	});

	it('returns undefined for empty q param', () => {
		const params = new URLSearchParams('q=');
		expect(parseExploreParams(params).q).toBeUndefined();
	});

	it('reads sort param from URL', () => {
		const params = new URLSearchParams('sort=stars');
		expect(parseExploreParams(params).sort).toBe('stars');
	});

	it('defaults sort to trending for invalid sort value', () => {
		const params = new URLSearchParams('sort=invalid');
		expect(parseExploreParams(params).sort).toBe('trending');
	});

	it('reads page param from URL', () => {
		const params = new URLSearchParams('page=3');
		expect(parseExploreParams(params).page).toBe(3);
	});

	it('defaults page to 1 for invalid page value', () => {
		const params = new URLSearchParams('page=abc');
		expect(parseExploreParams(params).page).toBe(1);
	});

	it('reads multiple agent params from URL', () => {
		const params = new URLSearchParams('agent=claude&agent=cursor');
		expect(parseExploreParams(params).agents).toEqual(['claude', 'cursor']);
	});

	it('reads combined q and sort params', () => {
		const params = new URLSearchParams('q=test&sort=trending');
		const result = parseExploreParams(params);
		expect(result.q).toBe('test');
		expect(result.sort).toBe('trending');
	});

	it('page minimum is 1 even when param is 0 or negative', () => {
		expect(parseExploreParams(new URLSearchParams('page=0')).page).toBe(1);
		expect(parseExploreParams(new URLSearchParams('page=-5')).page).toBe(1);
	});
});
