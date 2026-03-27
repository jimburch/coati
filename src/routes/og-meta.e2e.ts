import { expect, test } from '@playwright/test';

test('explore page has correct og:title meta tag', async ({ page }) => {
	await page.goto('/explore');
	const ogTitle = page.locator('meta[property="og:title"]');
	await expect(ogTitle).toHaveAttribute('content', 'Explore Setups - Coati');
});

test('explore page has correct og:description meta tag', async ({ page }) => {
	await page.goto('/explore');
	const ogDesc = page.locator('meta[property="og:description"]');
	await expect(ogDesc).toHaveAttribute(
		'content',
		'Browse AI coding workflows and setups on Coati.'
	);
});

test('explore page has correct og:type meta tag', async ({ page }) => {
	await page.goto('/explore');
	const ogType = page.locator('meta[property="og:type"]');
	await expect(ogType).toHaveAttribute('content', 'website');
});

test('explore page has correct og:site_name meta tag', async ({ page }) => {
	await page.goto('/explore');
	const ogSiteName = page.locator('meta[property="og:site_name"]');
	await expect(ogSiteName).toHaveAttribute('content', 'Coati');
});

test('explore page has og:url meta tag', async ({ page }) => {
	await page.goto('/explore');
	const ogUrl = page.locator('meta[property="og:url"]');
	await expect(ogUrl).toHaveAttribute('content', /.+/);
});

test('explore page has og:image meta tag', async ({ page }) => {
	await page.goto('/explore');
	const ogImage = page.locator('meta[property="og:image"]');
	await expect(ogImage).toHaveAttribute('content', /.+/);
});

test('explore page has twitter:card meta tag', async ({ page }) => {
	await page.goto('/explore');
	const twitterCard = page.locator('meta[name="twitter:card"]');
	await expect(twitterCard).toHaveAttribute('content', 'summary');
});

test('explore page has twitter:title meta tag', async ({ page }) => {
	await page.goto('/explore');
	const twitterTitle = page.locator('meta[name="twitter:title"]');
	await expect(twitterTitle).toHaveAttribute('content', 'Explore Setups - Coati');
});

test('explore page has twitter:description meta tag', async ({ page }) => {
	await page.goto('/explore');
	const twitterDesc = page.locator('meta[name="twitter:description"]');
	await expect(twitterDesc).toHaveAttribute(
		'content',
		'Browse AI coding workflows and setups on Coati.'
	);
});

test('explore page has twitter:image meta tag', async ({ page }) => {
	await page.goto('/explore');
	const twitterImage = page.locator('meta[name="twitter:image"]');
	await expect(twitterImage).toHaveAttribute('content', /.+/);
});
