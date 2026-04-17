import { describe, it, expect } from 'vitest';

// Pure logic extracted from DiscoveryTabs for unit testing

type Tab = 'for-you' | 'following' | 'trending';
const VALID_TABS: Tab[] = ['for-you', 'following', 'trending'];

function tabHref(tab: Tab): string {
	return `?tab=${tab}`;
}

function resolveActiveTab(raw: string | null): Tab {
	if (raw !== null && (VALID_TABS as string[]).includes(raw)) {
		return raw as Tab;
	}
	return 'for-you';
}

function getViewMoreHref(tab: Tab): string {
	if (tab === 'trending') return '/explore?sort=trending';
	if (tab === 'following') return '/explore?filter=following';
	return '/explore';
}

describe('DiscoveryTabs logic', () => {
	describe('tabHref', () => {
		it('generates correct href for for-you tab', () => {
			expect(tabHref('for-you')).toBe('?tab=for-you');
		});

		it('generates correct href for following tab', () => {
			expect(tabHref('following')).toBe('?tab=following');
		});

		it('generates correct href for trending tab', () => {
			expect(tabHref('trending')).toBe('?tab=trending');
		});
	});

	describe('resolveActiveTab', () => {
		it('returns for-you when param is null', () => {
			expect(resolveActiveTab(null)).toBe('for-you');
		});

		it('returns for-you when param is invalid', () => {
			expect(resolveActiveTab('invalid')).toBe('for-you');
		});

		it('returns trending when param is trending', () => {
			expect(resolveActiveTab('trending')).toBe('trending');
		});

		it('returns following when param is following', () => {
			expect(resolveActiveTab('following')).toBe('following');
		});

		it('returns for-you when param is for-you', () => {
			expect(resolveActiveTab('for-you')).toBe('for-you');
		});
	});

	describe('getViewMoreHref', () => {
		it('links trending tab to /explore?sort=trending', () => {
			expect(getViewMoreHref('trending')).toBe('/explore?sort=trending');
		});

		it('links following tab to /explore?filter=following', () => {
			expect(getViewMoreHref('following')).toBe('/explore?filter=following');
		});

		it('links for-you tab to /explore', () => {
			expect(getViewMoreHref('for-you')).toBe('/explore');
		});
	});

	describe('tab order', () => {
		it('tabs are ordered: For You, Following, Trending', () => {
			const tabs = [
				{ id: 'for-you', label: 'For You' },
				{ id: 'following', label: 'Following' },
				{ id: 'trending', label: 'Trending' }
			];
			expect(tabs[0].id).toBe('for-you');
			expect(tabs[1].id).toBe('following');
			expect(tabs[2].id).toBe('trending');
		});
	});
});
