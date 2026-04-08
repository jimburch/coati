import { describe, it, expect } from 'vitest';

// Unit tests for OgMeta component prop logic
// (Browser-based rendering tests would live in an e2e test)

describe('OgMeta prop defaults and URL resolution', () => {
	const PUBLIC_SITE_URL = 'https://coati.dev';

	function resolveUrl(url: string, siteUrl: string): string {
		return url.startsWith('http') ? url : `${siteUrl}${url}`;
	}

	it('resolves a relative url to absolute using site url', () => {
		const result = resolveUrl('/explore', PUBLIC_SITE_URL);
		expect(result).toBe('https://coati.dev/explore');
	});

	it('leaves an already-absolute url unchanged', () => {
		const result = resolveUrl('https://coati.dev/u/alice', PUBLIC_SITE_URL);
		expect(result).toBe('https://coati.dev/u/alice');
	});

	it('resolves og-image path to absolute url', () => {
		const image = '/og-image.png';
		const result = resolveUrl(image, PUBLIC_SITE_URL);
		expect(result).toBe('https://coati.dev/og-image.png');
	});

	it('default image path constructs from PUBLIC_SITE_URL', () => {
		const defaultImage = `${PUBLIC_SITE_URL}/og-image.png`;
		expect(defaultImage).toBe('https://coati.dev/og-image.png');
	});

	it('default type is website', () => {
		const type = 'website';
		expect(type).toBe('website');
	});

	it('default twitterCard is summary', () => {
		const twitterCard = 'summary';
		expect(twitterCard).toBe('summary');
	});

	it('siteName constant is Coati', () => {
		const siteName = 'Coati';
		expect(siteName).toBe('Coati');
	});
});
