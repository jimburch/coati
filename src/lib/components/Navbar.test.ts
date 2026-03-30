import { describe, it, expect } from 'vitest';

// Pure logic extracted from Navbar mobile search behavior

function toggleMobileSearch(current: boolean): boolean {
	return !current;
}

function openMobileSearch(): { mobileSearchOpen: boolean; menuOpen: boolean } {
	return { mobileSearchOpen: true, menuOpen: false };
}

function closeMobileSearch(): { mobileSearchOpen: boolean } {
	return { mobileSearchOpen: false };
}

function isClickOutside(
	container: { contains: (el: unknown) => boolean } | undefined,
	target: unknown
): boolean {
	if (!container) return false;
	return !container.contains(target);
}

describe('mobile search state', () => {
	it('openMobileSearch sets mobileSearchOpen to true and closes hamburger', () => {
		const result = openMobileSearch();
		expect(result.mobileSearchOpen).toBe(true);
		expect(result.menuOpen).toBe(false);
	});

	it('closeMobileSearch sets mobileSearchOpen to false', () => {
		const result = closeMobileSearch();
		expect(result.mobileSearchOpen).toBe(false);
	});

	it('toggleMobileSearch flips false to true', () => {
		expect(toggleMobileSearch(false)).toBe(true);
	});

	it('toggleMobileSearch flips true to false', () => {
		expect(toggleMobileSearch(true)).toBe(false);
	});
});

describe('isClickOutside', () => {
	it('returns false when container is undefined', () => {
		expect(isClickOutside(undefined, {})).toBe(false);
	});

	it('returns true when target is not inside container', () => {
		const container = { contains: () => false };
		expect(isClickOutside(container, {})).toBe(true);
	});

	it('returns false when target is inside container', () => {
		const container = { contains: () => true };
		expect(isClickOutside(container, {})).toBe(false);
	});
});
