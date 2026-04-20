import { expect, test, type Page } from '@playwright/test';

const SETTINGS_URL = '/settings';

// The (app) layout has ssr: false, so the server-side redirect for unauthenticated
// users triggers a client-side fetch + navigation chain that runs AFTER
// page.goto returns. Wait for the network to go idle so the chain resolves
// before we check the URL.
async function gotoSettingsAndCheckAuth(page: Page): Promise<boolean> {
	await page.goto(SETTINGS_URL);
	await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
	const url = page.url();
	return url.endsWith('/settings') && !url.includes('/auth/');
}

test('unauthenticated user is redirected to login', async ({ page }) => {
	await page.goto(SETTINGS_URL);
	await expect(page).toHaveURL(/auth\/login\/github|github\.com\/login/);
});

test('profile form renders with expected fields', async ({ page }) => {
	if (!(await gotoSettingsAndCheckAuth(page))) {
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
	if (!(await gotoSettingsAndCheckAuth(page))) {
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
	if (!(await gotoSettingsAndCheckAuth(page))) {
		test.skip();
		return;
	}
	const avatarSection = page.getByTestId('account-avatar');
	await expect(avatarSection).toContainText('Managed via GitHub');
});

test('GitHub username links to GitHub profile', async ({ page }) => {
	if (!(await gotoSettingsAndCheckAuth(page))) {
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
	if (!(await gotoSettingsAndCheckAuth(page))) {
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
	if (!(await gotoSettingsAndCheckAuth(page))) {
		test.skip();
		return;
	}
	await page.getByTestId('input-website').fill('not-a-valid-url');
	await page.getByTestId('save-button').click();
	await expect(page.getByTestId('form-error')).toBeVisible();
	await expect(page.getByTestId('form-error')).toContainText(/valid URL/i);
});

test('successful save shows success message', async ({ page }) => {
	if (!(await gotoSettingsAndCheckAuth(page))) {
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
	if (!(await gotoSettingsAndCheckAuth(page))) {
		await expect(page).toHaveURL(/auth\/login\/github|github\.com\/login/);
		return;
	}
	await expect(page.getByTestId('profile-section')).toBeVisible();
	await expect(page.getByTestId('account-section')).toBeVisible();
});

test('mobile: settings page renders at 430x932', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	if (!(await gotoSettingsAndCheckAuth(page))) {
		await expect(page).toHaveURL(/auth\/login\/github|github\.com\/login/);
		return;
	}
	await expect(page.getByTestId('profile-section')).toBeVisible();
	await expect(page.getByTestId('account-section')).toBeVisible();
});
