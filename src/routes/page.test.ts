import { describe, it, expect } from 'vitest';

// Pure logic extracted from +page.svelte buildUrl function
// Tests URL construction for home dashboard search filters, sort, and pagination

type ExploreSort = 'trending' | 'stars' | 'clones' | 'newest';

interface HomeSearchState {
	q?: string;
	agents?: string[];
	tag?: string;
	sort: ExploreSort;
	page: number;
}

function buildHomeUrl(
	current: HomeSearchState,
	overrides: {
		q?: string | undefined;
		agents?: string[] | undefined;
		tag?: string | undefined;
		sort?: string | undefined;
		page?: number | undefined;
	} = {}
): string {
	const merged = {
		q: 'q' in overrides ? overrides.q : current.q,
		agents: 'agents' in overrides ? overrides.agents : current.agents,
		tag: 'tag' in overrides ? overrides.tag : current.tag,
		sort: 'sort' in overrides ? overrides.sort : current.sort,
		page: 'page' in overrides ? overrides.page : current.page
	};

	const parts: string[] = [];
	if (merged.q) parts.push(`q=${encodeURIComponent(merged.q)}`);
	for (const slug of merged.agents ?? []) {
		parts.push(`agent=${encodeURIComponent(slug)}`);
	}
	if (merged.tag) parts.push(`tag=${encodeURIComponent(String(merged.tag))}`);
	if (merged.sort && merged.sort !== 'newest') parts.push(`sort=${merged.sort}`);
	if (merged.page && Number(merged.page) > 1) parts.push(`page=${String(merged.page)}`);

	return `/${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
}

// Pure logic extracted from +page.server.ts load function
// Tests URL param parsing into home search state
function parseHomeParams(searchParams: URLSearchParams): HomeSearchState {
	const VALID_SORTS: ExploreSort[] = ['trending', 'stars', 'clones', 'newest'];
	const q = searchParams.get('q') || undefined;
	const agents = searchParams.getAll('agent').filter(Boolean);
	const tag = searchParams.get('tag') || undefined;
	const sortParam = searchParams.get('sort') || 'newest';
	const sort: ExploreSort = VALID_SORTS.includes(sortParam as ExploreSort)
		? (sortParam as ExploreSort)
		: 'newest';
	const page = Math.max(1, Number(searchParams.get('page')) || 1);
	return { q, agents, tag, sort, page };
}

function isSearchActive(state: HomeSearchState): boolean {
	return !!state.q || (state.agents?.length ?? 0) > 0 || !!state.tag || state.sort !== 'newest';
}

const base: HomeSearchState = { sort: 'newest', page: 1 };

describe('buildHomeUrl', () => {
	it('returns / with no params when state is default', () => {
		expect(buildHomeUrl(base)).toBe('/');
	});

	it('includes q param when query is set', () => {
		expect(buildHomeUrl(base, { q: 'claude' })).toBe('/?q=claude');
	});

	it('encodes spaces in q param', () => {
		expect(buildHomeUrl(base, { q: 'hello world' })).toBe('/?q=hello%20world');
	});

	it('omits q param when q is undefined', () => {
		const current = { ...base, q: 'previous' };
		expect(buildHomeUrl(current, { q: undefined })).toBe('/');
	});

	it('includes sort param for non-default sort', () => {
		expect(buildHomeUrl(base, { sort: 'stars' })).toBe('/?sort=stars');
	});

	it('omits sort param when sort is newest (default)', () => {
		expect(buildHomeUrl(base, { sort: 'newest' })).toBe('/');
	});

	it('includes page param when page > 1', () => {
		expect(buildHomeUrl(base, { page: 2 })).toBe('/?page=2');
	});

	it('omits page param when page is 1', () => {
		expect(buildHomeUrl(base, { page: 1 })).toBe('/');
	});

	it('omits page param when page is undefined', () => {
		expect(buildHomeUrl({ ...base, page: 3 }, { page: undefined })).toBe('/');
	});

	it('includes single agent param', () => {
		expect(buildHomeUrl(base, { agents: ['claude'] })).toBe('/?agent=claude');
	});

	it('includes multiple agent params', () => {
		const url = buildHomeUrl(base, { agents: ['claude', 'cursor'] });
		expect(url).toBe('/?agent=claude&agent=cursor');
	});

	it('omits agent params when agents array is empty', () => {
		const current = { ...base, agents: ['claude'] };
		expect(buildHomeUrl(current, { agents: [] })).toBe('/');
	});

	it('includes tag param when set', () => {
		expect(buildHomeUrl(base, { tag: 'typescript' })).toBe('/?tag=typescript');
	});

	it('omits tag param when tag is undefined', () => {
		const current = { ...base, tag: 'typescript' };
		expect(buildHomeUrl(current, { tag: undefined })).toBe('/');
	});

	it('combines q and sort params correctly', () => {
		expect(buildHomeUrl(base, { q: 'claude', sort: 'stars' })).toBe('/?q=claude&sort=stars');
	});

	it('combines q, agent, sort, and page params in correct order', () => {
		const url = buildHomeUrl(base, { q: 'test', agents: ['claude'], sort: 'stars', page: 2 });
		expect(url).toBe('/?q=test&agent=claude&sort=stars&page=2');
	});

	it('uses current state values when no overrides provided', () => {
		const current: HomeSearchState = {
			q: 'existing',
			agents: ['claude'],
			tag: 'ts',
			sort: 'stars',
			page: 2
		};
		expect(buildHomeUrl(current)).toBe('/?q=existing&agent=claude&tag=ts&sort=stars&page=2');
	});

	it('encodes special characters in agent slug', () => {
		expect(buildHomeUrl(base, { agents: ['claude code'] })).toBe('/?agent=claude%20code');
	});

	it('encodes special characters in tag', () => {
		expect(buildHomeUrl(base, { tag: 'c++' })).toBe('/?tag=c%2B%2B');
	});
});

describe('parseHomeParams', () => {
	it('returns default state for empty params', () => {
		const params = new URLSearchParams('');
		const result = parseHomeParams(params);
		expect(result.q).toBeUndefined();
		expect(result.agents).toEqual([]);
		expect(result.tag).toBeUndefined();
		expect(result.sort).toBe('newest');
		expect(result.page).toBe(1);
	});

	it('reads q param from URL', () => {
		const params = new URLSearchParams('q=claude');
		expect(parseHomeParams(params).q).toBe('claude');
	});

	it('returns undefined for empty q param', () => {
		const params = new URLSearchParams('q=');
		expect(parseHomeParams(params).q).toBeUndefined();
	});

	it('reads sort param from URL', () => {
		const params = new URLSearchParams('sort=stars');
		expect(parseHomeParams(params).sort).toBe('stars');
	});

	it('defaults sort to newest for invalid sort value', () => {
		const params = new URLSearchParams('sort=invalid');
		expect(parseHomeParams(params).sort).toBe('newest');
	});

	it('reads page param from URL', () => {
		const params = new URLSearchParams('page=3');
		expect(parseHomeParams(params).page).toBe(3);
	});

	it('defaults page to 1 for invalid page value', () => {
		const params = new URLSearchParams('page=abc');
		expect(parseHomeParams(params).page).toBe(1);
	});

	it('reads multiple agent params from URL', () => {
		const params = new URLSearchParams('agent=claude&agent=cursor');
		expect(parseHomeParams(params).agents).toEqual(['claude', 'cursor']);
	});

	it('reads tag param from URL', () => {
		const params = new URLSearchParams('tag=typescript');
		expect(parseHomeParams(params).tag).toBe('typescript');
	});

	it('reads combined q and sort params', () => {
		const params = new URLSearchParams('q=test&sort=trending');
		const result = parseHomeParams(params);
		expect(result.q).toBe('test');
		expect(result.sort).toBe('trending');
	});

	it('page minimum is 1 even when param is 0 or negative', () => {
		expect(parseHomeParams(new URLSearchParams('page=0')).page).toBe(1);
		expect(parseHomeParams(new URLSearchParams('page=-5')).page).toBe(1);
	});

	it('filters empty agent strings from URL', () => {
		const params = new URLSearchParams('agent=claude&agent=');
		expect(parseHomeParams(params).agents).toEqual(['claude']);
	});
});

describe('isSearchActive', () => {
	it('returns false when state is default', () => {
		expect(isSearchActive(base)).toBe(false);
	});

	it('returns true when q is set', () => {
		expect(isSearchActive({ ...base, q: 'test' })).toBe(true);
	});

	it('returns true when agents are set', () => {
		expect(isSearchActive({ ...base, agents: ['claude'] })).toBe(true);
	});

	it('returns true when tag is set', () => {
		expect(isSearchActive({ ...base, tag: 'typescript' })).toBe(true);
	});

	it('returns true when sort is non-default', () => {
		expect(isSearchActive({ ...base, sort: 'stars' })).toBe(true);
	});

	it('returns false when agents array is empty', () => {
		expect(isSearchActive({ ...base, agents: [] })).toBe(false);
	});

	it('returns false when sort is newest (default)', () => {
		expect(isSearchActive({ ...base, sort: 'newest' })).toBe(false);
	});
});
