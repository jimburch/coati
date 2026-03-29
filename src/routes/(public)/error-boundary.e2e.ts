import { expect, test } from '@playwright/test';

// A route that doesn't exist under (public)/[username]/[slug] — triggers the (public) error boundary
const NOT_FOUND_URL = '/this-user-does-not-exist-xyz/this-setup-does-not-exist-xyz';

test('public 404: nav bar is visible', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.locator('header')).toBeVisible();
});

test('public 404: "Coati" logo link is visible in nav', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.getByRole('link', { name: 'Coati' })).toBeVisible();
});

test('public 404: shows "Page not found" heading', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('public 404: shows 404 status code', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.getByText('404')).toBeVisible();
});

test('public 404: has "Go home" link to /', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	const goHome = page.getByRole('link', { name: 'Go home' });
	await expect(goHome).toBeVisible();
	await expect(goHome).toHaveAttribute('href', '/');
});

test('public 404: has "Go back" button', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
});

test('mobile: public 404 nav and error message visible', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(NOT_FOUND_URL);
	await expect(page.locator('header')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('desktop: public 404 nav and error message visible at 1280x720', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only');
	await page.goto(NOT_FOUND_URL);
	await expect(page.locator('header')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
