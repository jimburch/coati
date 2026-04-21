import { describe, it, expect } from 'vitest';

// Extract the pure logic from Pagination.svelte for testing
function getPageNumbers(current: number, total: number): (number | '...')[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

	const pages: (number | '...')[] = [1];

	if (current > 3) pages.push('...');

	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);
	for (let i = start; i <= end; i++) pages.push(i);

	if (current < total - 2) pages.push('...');

	pages.push(total);
	return pages;
}

describe('Pagination getPageNumbers', () => {
	it('renders the expected page/ellipsis pattern for each (current, total) combination', () => {
		// Under the 7-page threshold: show all pages
		expect(getPageNumbers(1, 1)).toEqual([1]);
		expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
		expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);

		// Above threshold: ellipses appear based on current page position
		expect(getPageNumbers(1, 10)).toEqual([1, 2, '...', 10]); // first page
		expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10]); // no start ellipsis
		expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]); // both
		expect(getPageNumbers(8, 10)).toEqual([1, '...', 7, 8, 9, 10]); // no end ellipsis
		expect(getPageNumbers(10, 10)).toEqual([1, '...', 9, 10]); // last page
	});

	it('always includes first page, last page, and current page', () => {
		for (let p = 1; p <= 20; p++) {
			const pages = getPageNumbers(p, 20);
			expect(pages[0]).toBe(1);
			expect(pages[pages.length - 1]).toBe(20);
			expect(pages).toContain(p);
		}
	});
});
