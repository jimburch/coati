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
	it('shows all pages when total <= 7', () => {
		expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
		expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
	});

	it('returns single page for total = 1', () => {
		expect(getPageNumbers(1, 1)).toEqual([1]);
	});

	it('shows ellipsis at end when on first page with many pages', () => {
		expect(getPageNumbers(1, 10)).toEqual([1, 2, '...', 10]);
	});

	it('shows ellipsis at start when on last page', () => {
		expect(getPageNumbers(10, 10)).toEqual([1, '...', 9, 10]);
	});

	it('shows both ellipses when in the middle', () => {
		expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
	});

	it('shows no start ellipsis when on page 3', () => {
		expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10]);
	});

	it('shows no end ellipsis when near the last page', () => {
		expect(getPageNumbers(8, 10)).toEqual([1, '...', 7, 8, 9, 10]);
	});

	it('always includes first and last page', () => {
		for (let p = 1; p <= 20; p++) {
			const pages = getPageNumbers(p, 20);
			expect(pages[0]).toBe(1);
			expect(pages[pages.length - 1]).toBe(20);
		}
	});

	it('always includes the current page', () => {
		for (let p = 1; p <= 20; p++) {
			const pages = getPageNumbers(p, 20);
			expect(pages).toContain(p);
		}
	});
});
