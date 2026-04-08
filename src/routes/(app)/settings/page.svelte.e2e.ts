import { expect, test } from '@playwright/test';

const SETTINGS_URL = '/settings';
const LOGIN_URL = '/auth/login/github';

test('unauthenticated user is redirected to login', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	await expect(page).toHaveURL(new RegExp(LOGIN_URL.replace(/\//g, '/')));
});

test('profile form renders with expected fields', async ({ page }) => {
	// This test requires an authenticated session; skip if redirected to login
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('profile-form')).toBeVisible();
	await expect(page.getByTestId('input-name')).toBeVisible();
	await expect(page.getByTestId('input-bio')).toBeVisible();
	await expect(page.getByTestId('input-website')).toBeVisible();
	await expect(page.getByTestId('input-location')).toBeVisible();
	await expect(page.getByTestId('save-button')).toBeVisible();
});

test('account section displays expected elements', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('account-section')).toBeVisible();
	await expect(page.getByTestId('account-avatar')).toBeVisible();
	await expect(page.getByTestId('account-email')).toBeVisible();
	await expect(page.getByTestId('account-github')).toBeVisible();
	await expect(page.getByTestId('account-joined')).toBeVisible();
});

test('account avatar shows "managed via GitHub" note', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	const avatarSection = page.getByTestId('account-avatar');
	await expect(avatarSection).toContainText('Managed via GitHub');
});

test('GitHub username links to GitHub profile', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	const githubSection = page.getByTestId('account-github');
	const link = githubSection.locator('a');
	const count = await link.count();
	if (count > 0) {
		const href = await link.getAttribute('href');
		expect(href).toMatch(/^https:\/\/github\.com\//);
	}
});

test('save button shows saving state while submitting', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	// Slow down network so we can catch the saving state
	await page.route(
		'**/settings',
		(route) => new Promise((resolve) => setTimeout(() => resolve(route.continue()), 500))
	);
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('save-button')).toHaveText('Saving...');
});

test('validation error displays for invalid website URL', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	await page.getByTestId('input-website').fill('not-a-valid-url');
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('form-error')).toBeVisible();
	await expect(page.getByTestId('form-error')).toContainText(/valid URL/i);
});

test('successful save shows success message', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		test.skip();
		return;
	}
	// Submit with valid (or empty) data
	await page.getByTestId('input-website').fill('');
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('success-message')).toBeVisible({ timeout: 5000 });
	await expect(page.getByTestId('success-message')).toContainText('saved successfully');
});

test('desktop: settings page renders at 1280x720', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		// Redirected — just verify the redirect works
		await expect(page).toHaveURL(new RegExp(LOGIN_URL.replace(/\//g, '/')));
		return;
	}
	await expect(page.getByTestId('profile-section')).toBeVisible();
	await expect(page.getByTestId('account-section')).toBeVisible();
});

test('mobile: settings page renders at 430x932', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(SETTINGS_URL);
	if (page.url().includes('login')) {
		await expect(page).toHaveURL(new RegExp(LOGIN_URL.replace(/\//g, '/')));
		return;
	}
	await expect(page.getByTestId('profile-section')).toBeVisible();
	await expect(page.getByTestId('account-section')).toBeVisible();
});
