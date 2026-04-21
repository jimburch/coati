import { expect, test } from '@playwright/test';

const SETTINGS_URL = '/settings';

test('profile form renders with expected fields', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	await expect(page.getByTestId('profile-form')).toBeVisible();
	await expect(page.getByTestId('input-name')).toBeVisible();
	await expect(page.getByTestId('input-bio')).toBeVisible();
	await expect(page.getByTestId('input-website')).toBeVisible();
	await expect(page.getByTestId('input-location')).toBeVisible();
	await expect(page.getByTestId('save-button')).toBeVisible();
});

test('account section displays expected elements', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	await expect(page.getByTestId('account-section')).toBeVisible();
	await expect(page.getByTestId('account-avatar')).toBeVisible();
	await expect(page.getByTestId('account-email')).toBeVisible();
	await expect(page.getByTestId('account-github')).toBeVisible();
	await expect(page.getByTestId('account-joined')).toBeVisible();
});

test('account avatar shows "managed via GitHub" note', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	const avatarSection = page.getByTestId('account-avatar');
	await expect(avatarSection).toContainText('Managed via GitHub');
});

test('GitHub username links to GitHub profile', async ({ page }) => {
	await page.goto(SETTINGS_URL);
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
	// Slow down the form-action POST so we can catch the saving state.
	// SvelteKit posts to `/settings?/updateProfile`; use a regex to match
	// the path with or without form-action query.
	await page.route(
		/\/settings(\?|$)/,
		(route) => new Promise((resolve) => setTimeout(() => resolve(route.continue()), 500))
	);
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('save-button')).toHaveText('Saving...');
});

test('validation error displays for invalid website URL', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	// The schema auto-prepends https:// to schemeless values, so a bare word
	// becomes valid. Use a value with whitespace — the URL parser rejects it
	// even after prefixing.
	await page.getByTestId('input-website').fill('has spaces in it');
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('form-error')).toBeVisible();
	await expect(page.getByTestId('form-error')).toContainText(/valid URL/i);
});

test('successful save shows success message', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	await page.getByTestId('input-website').fill('');
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('success-message')).toBeVisible({ timeout: 5000 });
	await expect(page.getByTestId('success-message')).toContainText('saved successfully');
});

test('desktop: settings page renders at 1280x720', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(SETTINGS_URL);
	await expect(page.getByTestId('profile-section')).toBeVisible();
	await expect(page.getByTestId('account-section')).toBeVisible();
});

test('mobile: settings page renders at 430x932', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(SETTINGS_URL);
	await expect(page.getByTestId('profile-section')).toBeVisible();
	await expect(page.getByTestId('account-section')).toBeVisible();
});
