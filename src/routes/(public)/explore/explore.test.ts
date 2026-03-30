import { describe, it, expect } from 'vitest';

// Pure logic extracted from explore/+page.svelte buildUrl function
// Tests URL construction for explore page filters, sort, and pagination

type ExploreSort = 'trending' | 'stars' | 'clones' | 'newest';

interface ExploreState {
	q?: string;
	agents?: string[];
	tag?: string;
	sort: ExploreSort;
	page: number;
}

function buildUrl(
	current: ExploreState,
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

	return `/explore${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
}

// Pure logic extracted from explore/+page.server.ts load function
// Tests URL param parsing into explore state
function parseExploreParams(searchParams: URLSearchParams): Omit<ExploreState, 'sort'> & {
	sort: ExploreSort;
} {
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

const base: ExploreState = { sort: 'newest', page: 1 };

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

	it('omits sort param when sort is newest (default)', () => {
		expect(buildUrl(base, { sort: 'newest' })).toBe('/explore');
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

	it('includes tag param when set', () => {
		expect(buildUrl(base, { tag: 'typescript' })).toBe('/explore?tag=typescript');
	});

	it('omits tag param when tag is undefined', () => {
		const current = { ...base, tag: 'typescript' };
		expect(buildUrl(current, { tag: undefined })).toBe('/explore');
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
			tag: 'ts',
			sort: 'stars',
			page: 2
		};
		expect(buildUrl(current)).toBe('/explore?q=existing&agent=claude&tag=ts&sort=stars&page=2');
	});
});

describe('parseExploreParams (URL → state)', () => {
	it('returns default state for empty params', () => {
		const params = new URLSearchParams('');
		const result = parseExploreParams(params);
		expect(result.q).toBeUndefined();
		expect(result.agents).toEqual([]);
		expect(result.tag).toBeUndefined();
		expect(result.sort).toBe('newest');
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

	it('defaults sort to newest for invalid sort value', () => {
		const params = new URLSearchParams('sort=invalid');
		expect(parseExploreParams(params).sort).toBe('newest');
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

	it('reads tag param from URL', () => {
		const params = new URLSearchParams('tag=typescript');
		expect(parseExploreParams(params).tag).toBe('typescript');
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
