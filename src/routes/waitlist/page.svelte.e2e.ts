import { test, expect } from '@playwright/test';

test('unauthenticated users can access landing and auth routes without waitlist redirect', async ({
	page
}) => {
	const landing = await page.goto('/');
	expect(landing?.status()).toBe(200);
	expect(page.url()).not.toContain('/waitlist');

	await page.goto('/auth/login/github');
	expect(page.url()).not.toContain('/waitlist');
});
