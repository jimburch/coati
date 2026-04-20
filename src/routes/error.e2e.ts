import { expect, test } from '@playwright/test';

const NOT_FOUND_URL = '/this-route-does-not-exist-at-all';

test('404 page renders status, heading, message, and navigation actions', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.getByText('404')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await expect(page.getByText(/URL you're looking for doesn't exist/)).toBeVisible();

	const goHome = page.getByRole('link', { name: 'Go home' });
	await expect(goHome).toBeVisible();
	await expect(goHome).toHaveAttribute('href', '/');
	await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
});

test('mobile: 404 page has no horizontal overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(NOT_FOUND_URL);
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
