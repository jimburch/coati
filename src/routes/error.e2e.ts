import { expect, test } from '@playwright/test';

test('404 page shows status code', async ({ page }) => {
	await page.goto('/this-route-does-not-exist-at-all');
	await expect(page.getByText('404')).toBeVisible();
});

test('404 page shows "Page not found" heading', async ({ page }) => {
	await page.goto('/this-route-does-not-exist-at-all');
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('404 page shows descriptive message', async ({ page }) => {
	await page.goto('/this-route-does-not-exist-at-all');
	await expect(page.getByText(/URL you're looking for doesn't exist/)).toBeVisible();
});

test('404 page has "Go home" link to /', async ({ page }) => {
	await page.goto('/this-route-does-not-exist-at-all');
	const goHome = page.getByRole('link', { name: 'Go home' });
	await expect(goHome).toBeVisible();
	await expect(goHome).toHaveAttribute('href', '/');
});

test('404 page has "Go back" button', async ({ page }) => {
	await page.goto('/this-route-does-not-exist-at-all');
	await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
});

test('mobile: 404 page has no horizontal overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto('/this-route-does-not-exist-at-all');
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('mobile: 404 "Go home" and "Go back" buttons are visible', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto('/this-route-does-not-exist-at-all');
	await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
});

test('desktop: 404 page heading is visible at 1280x720', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.goto('/this-route-does-not-exist-at-all');
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible();
});
