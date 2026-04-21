import { expect, test } from '@playwright/test';

const SETTINGS_URL = '/settings';

// Unauthenticated-only coverage for /settings. Authenticated-user coverage
// lives in page.svelte.auth.e2e.ts and runs under the desktop-auth /
// mobile-auth projects with a seeded session cookie.

test('unauthenticated user is redirected to login', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	await expect(page).toHaveURL(/auth\/login\/github|github\.com\/login/);
});
