import { describe, it, expect } from 'vitest';

// Pure logic for the global '/' keyboard shortcut
function shouldHandleSlashKey(
	event: { key: string },
	activeElement: { tagName?: string; getAttribute?: (attr: string) => string | null } | null
): boolean {
	if (event.key !== '/') return false;
	if (!activeElement) return true;
	const tag = activeElement.tagName?.toUpperCase();
	if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;
	const contentEditable = activeElement.getAttribute?.('contenteditable');
	if (contentEditable !== null && contentEditable !== undefined && contentEditable !== 'false')
		return false;
	return true;
}

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

describe('shouldHandleSlashKey', () => {
	it('returns false for non-slash keys', () => {
		expect(shouldHandleSlashKey({ key: 'a' }, null)).toBe(false);
		expect(shouldHandleSlashKey({ key: 'Enter' }, null)).toBe(false);
		expect(shouldHandleSlashKey({ key: '?' }, null)).toBe(false);
	});

	it('returns true when key is / and activeElement is null', () => {
		expect(shouldHandleSlashKey({ key: '/' }, null)).toBe(true);
	});

	it('returns false when focused on INPUT', () => {
		expect(shouldHandleSlashKey({ key: '/' }, { tagName: 'INPUT' })).toBe(false);
		expect(shouldHandleSlashKey({ key: '/' }, { tagName: 'input' })).toBe(false);
	});

	it('returns false when focused on TEXTAREA', () => {
		expect(shouldHandleSlashKey({ key: '/' }, { tagName: 'TEXTAREA' })).toBe(false);
	});

	it('returns false when focused on SELECT', () => {
		expect(shouldHandleSlashKey({ key: '/' }, { tagName: 'SELECT' })).toBe(false);
	});

	it('returns false when focused on contenteditable=true element', () => {
		const el = {
			tagName: 'DIV',
			getAttribute: (attr: string) => (attr === 'contenteditable' ? 'true' : null)
		};
		expect(shouldHandleSlashKey({ key: '/' }, el)).toBe(false);
	});

	it('returns false when focused on contenteditable="" element', () => {
		const el = {
			tagName: 'DIV',
			getAttribute: (attr: string) => (attr === 'contenteditable' ? '' : null)
		};
		expect(shouldHandleSlashKey({ key: '/' }, el)).toBe(false);
	});

	it('returns true when focused on contenteditable=false element', () => {
		const el = {
			tagName: 'DIV',
			getAttribute: (attr: string) => (attr === 'contenteditable' ? 'false' : null)
		};
		expect(shouldHandleSlashKey({ key: '/' }, el)).toBe(true);
	});

	it('returns true when focused on a non-interactive element (e.g. BUTTON)', () => {
		expect(
			shouldHandleSlashKey({ key: '/' }, { tagName: 'BUTTON', getAttribute: () => null })
		).toBe(true);
	});

	it('returns true when focused on BODY', () => {
		expect(shouldHandleSlashKey({ key: '/' }, { tagName: 'BODY', getAttribute: () => null })).toBe(
			true
		);
	});
});

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
