import { describe, it, expect } from 'vitest';

// Pure logic extracted from SearchBar.svelte and Navbar.svelte handleMobileSearch
// Both use the same URL-building logic for navigating to /explore

function buildSearchUrl(query: string): string {
	const trimmed = query.trim();
	if (trimmed) {
		return `/explore?q=${encodeURIComponent(trimmed)}`;
	}
	return '/explore';
}

describe('navbar search URL generation', () => {
	it('navigates to /explore?q=<query> for a non-empty query', () => {
		expect(buildSearchUrl('claude')).toBe('/explore?q=claude');
	});

	it('navigates to /explore for an empty string', () => {
		expect(buildSearchUrl('')).toBe('/explore');
	});

	it('navigates to /explore for whitespace-only input', () => {
		expect(buildSearchUrl('   ')).toBe('/explore');
	});

	it('trims leading and trailing whitespace from the query', () => {
		expect(buildSearchUrl('  hello world  ')).toBe('/explore?q=hello%20world');
	});

	it('encodes spaces as %20', () => {
		expect(buildSearchUrl('hello world')).toBe('/explore?q=hello%20world');
	});

	it('encodes special characters', () => {
		expect(buildSearchUrl('claude & code')).toBe('/explore?q=claude%20%26%20code');
	});

	it('encodes hash characters', () => {
		expect(buildSearchUrl('setup #1')).toBe('/explore?q=setup%20%231');
	});

	it('encodes question marks', () => {
		expect(buildSearchUrl('what?')).toBe('/explore?q=what%3F');
	});

	it('preserves alphanumeric queries unchanged', () => {
		expect(buildSearchUrl('mysetup123')).toBe('/explore?q=mysetup123');
	});

	it('preserves hyphens in query', () => {
		expect(buildSearchUrl('my-setup')).toBe('/explore?q=my-setup');
	});
});
