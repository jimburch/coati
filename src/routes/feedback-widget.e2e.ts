import { expect, test } from '@playwright/test';

// Note: The feedback widget only renders for authenticated + beta-approved users.
// These e2e tests verify the widget is absent for unauthenticated users and
// check the widget's presence/structure when accessed via the public routes.
// Full authenticated flow testing requires a test user seeded in the DB.

test('feedback widget is not visible for unauthenticated users on landing page', async ({
	page
}) => {
	await page.goto('/');
	await expect(page.getByTestId('feedback-widget')).toHaveCount(0);
});

test('feedback widget is not visible for unauthenticated users on explore page', async ({
	page
}) => {
	await page.goto('/explore');
	await expect(page.getByTestId('feedback-widget')).toHaveCount(0);
});

test('feedback widget is not visible on waitlist page', async ({ page }) => {
	await page.goto('/waitlist');
	await expect(page.getByTestId('feedback-widget')).toHaveCount(0);
});

test('desktop: feedback widget absent for unauthenticated user', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.goto('/');
	await expect(page.getByTestId('feedback-widget')).toHaveCount(0);
});

test('mobile: feedback widget absent for unauthenticated user', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto('/');
	await expect(page.getByTestId('feedback-widget')).toHaveCount(0);
});

test('desktop: landing page has no horizontal overflow with widget absent', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only');
	await page.goto('/');
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('mobile: landing page has no horizontal overflow with widget absent', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto('/');
	const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
	const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
	expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
