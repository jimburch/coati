import { describe, it, expect } from 'vitest';

// Unit tests for OgMeta component prop logic
// (Browser-based rendering tests would live in an e2e test)

describe('OgMeta prop defaults and URL resolution', () => {
	const PUBLIC_SITE_URL = 'https://coati.dev';

	function resolveUrl(url: string, siteUrl: string): string {
		return url.startsWith('http') ? url : `${siteUrl}${url}`;
	}

	it('resolves relative paths against the site url and leaves absolute urls alone', () => {
		expect(resolveUrl('/explore', PUBLIC_SITE_URL)).toBe('https://coati.dev/explore');
		expect(resolveUrl('/og-image.png', PUBLIC_SITE_URL)).toBe('https://coati.dev/og-image.png');
		expect(resolveUrl('https://coati.dev/u/alice', PUBLIC_SITE_URL)).toBe(
			'https://coati.dev/u/alice'
		);
	});
});
