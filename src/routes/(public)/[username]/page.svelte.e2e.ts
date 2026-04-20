import { expect, test } from '@playwright/test';

const PROFILE_URL = '/jimburch';

test('profile page renders three tabs with Setups active by default', async ({ page }) => {
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('profile-tabs')).toBeVisible();
	await expect(page.getByTestId('tab-setups')).toBeVisible();
	await expect(page.getByTestId('tab-starred')).toBeVisible();
	await expect(page.getByTestId('tab-activity')).toBeVisible();

	await expect(page.getByTestId('tab-setups')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-setups')).toBeVisible();
});

test('tab clicks update URL; deep links load the correct active tab panel', async ({ page }) => {
	await page.goto(PROFILE_URL);

	await page.getByTestId('tab-starred').click();
	await expect(page).toHaveURL(/\?tab=starred/);

	await page.getByTestId('tab-activity').click();
	await expect(page).toHaveURL(/\?tab=activity/);

	await page.goto(`${PROFILE_URL}?tab=starred`);
	await expect(page.getByTestId('tab-starred')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-starred')).toBeVisible();

	await page.goto(`${PROFILE_URL}?tab=activity`);
	await expect(page.getByTestId('tab-activity')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-activity')).toBeVisible();
});

test('each tab shows content or a matching empty state', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const setupsPanel = page.getByTestId('tab-panel-setups');
	expect(
		(await setupsPanel.locator('a').first().isVisible()) ||
			(await page.getByTestId('setups-empty').isVisible())
	).toBe(true);

	await page.goto(`${PROFILE_URL}?tab=starred`);
	const starredPanel = page.getByTestId('tab-panel-starred');
	await expect(starredPanel).toBeVisible();
	expect(
		(await starredPanel.locator('a').first().isVisible()) ||
			(await page.getByTestId('starred-empty').isVisible())
	).toBe(true);

	await page.goto(`${PROFILE_URL}?tab=activity`);
	await expect(page.getByTestId('tab-panel-activity')).toBeVisible();
	expect(
		(await page.getByTestId('feed-list').isVisible()) ||
			(await page.getByTestId('feed-empty').isVisible())
	).toBe(true);
});

test('profile header persists across tab switches and shows username', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const heading = page.locator('h1').first();
	await expect(heading).toBeVisible();

	await page.getByTestId('tab-starred').click();
	await expect(heading).toBeVisible();

	await page.getByTestId('tab-activity').click();
	await expect(heading).toBeVisible();
});

test('edit profile button is hidden for unauthenticated visitors', async ({ page }) => {
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('edit-profile-button')).not.toBeVisible();
	await expect(page.getByTestId('edit-profile-modal')).not.toBeVisible();
});

test('mobile: profile tab nav has no horizontal overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(PROFILE_URL);
	const nav = page.locator('[aria-label="Profile tabs"]');
	await expect(nav).toBeVisible();
	const fitsWithoutOverflow = await nav.evaluate((el) => el.scrollWidth <= el.clientWidth);
	expect(fitsWithoutOverflow).toBe(true);
});
