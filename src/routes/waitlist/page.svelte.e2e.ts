import { test, expect } from '@playwright/test';

test('waitlist page renders heading', async ({ page }) => {
	await page.goto('/waitlist');
	await expect(page.getByTestId('waitlist-heading')).toContainText("You're on the waitlist");
});

test('waitlist page renders message', async ({ page }) => {
	await page.goto('/waitlist');
	await expect(page.getByTestId('waitlist-message')).toBeVisible();
});

test('waitlist page has back to home link', async ({ page }) => {
	await page.goto('/waitlist');
	const link = page.locator('a[href="/"]');
	await expect(link).toBeVisible();
});

test('waitlist page has no feedback widget', async ({ page }) => {
	await page.goto('/waitlist');
	await expect(page.getByTestId('feedback-widget')).toHaveCount(0);
});

test('waitlist page renders correctly on mobile', async ({ page, isMobile }) => {
	if (!isMobile) test.skip();
	await page.goto('/waitlist');
	await expect(page.getByTestId('waitlist-heading')).toBeVisible();
});

test('waitlist page renders correctly on desktop', async ({ page, isMobile }) => {
	if (isMobile) test.skip();
	await page.goto('/waitlist');
	await expect(page.getByTestId('waitlist-heading')).toBeVisible();
});

test('unauthenticated user can access landing page', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
	expect(page.url()).not.toContain('/waitlist');
});

test('unauthenticated user can access auth route', async ({ page }) => {
	await page.goto('/auth/login/github');
	expect(page.url()).not.toContain('/waitlist');
});
