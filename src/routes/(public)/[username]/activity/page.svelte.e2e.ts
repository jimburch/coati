import { expect, test } from '@playwright/test';

const ACTIVITY_URL = '/jimburch/activity';

test('shows user avatar and username header', async ({ page }) => {
	await page.goto(ACTIVITY_URL);
	await expect(page.getByTestId('activity-username')).toBeVisible();
	await expect(page.getByTestId('activity-username')).toHaveText('jimburch');
});

test('username links back to profile page', async ({ page }) => {
	await page.goto(ACTIVITY_URL);
	const link = page.getByTestId('activity-username');
	await expect(link).toHaveAttribute('href', '/jimburch');
});

test('shows activity feed or empty state', async ({ page }) => {
	await page.goto(ACTIVITY_URL);
	const hasFeed = await page.getByTestId('feed-list').isVisible();
	const hasEmpty = await page.getByTestId('feed-empty').isVisible();
	expect(hasFeed || hasEmpty).toBe(true);
});

test('shows load more button when feed has 20 items', async ({ page }) => {
	await page.goto(ACTIVITY_URL);
	// If the feed is full (20+ items), the load more button should appear
	const feedList = page.getByTestId('feed-list');
	if (await feedList.isVisible()) {
		const items = feedList.locator('[data-testid]');
		const count = await items.count();
		if (count >= 20) {
			await expect(page.getByTestId('load-more-button')).toBeVisible();
		}
	}
});

test('load more button loads additional items', async ({ page }) => {
	await page.goto(ACTIVITY_URL);

	const loadMoreBtn = page.getByTestId('load-more-button');
	if (!(await loadMoreBtn.isVisible())) {
		test.skip();
		return;
	}

	const feedList = page.getByTestId('feed-list');
	const initialItems = await feedList.locator('> *').count();

	await loadMoreBtn.click();
	await expect(loadMoreBtn).not.toHaveText('Loading…');

	const updatedItems = await feedList.locator('> *').count();
	expect(updatedItems).toBeGreaterThan(initialItems);
});

test('page title includes username', async ({ page }) => {
	await page.goto(ACTIVITY_URL);
	await expect(page).toHaveTitle(/jimburch.*activity/i);
});

test('desktop layout renders correctly', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(ACTIVITY_URL);
	await expect(page.getByTestId('activity-username')).toBeVisible();
});

test('mobile layout renders correctly', async ({ page }) => {
	await page.setViewportSize({ width: 430, height: 932 });
	await page.goto(ACTIVITY_URL);
	await expect(page.getByTestId('activity-username')).toBeVisible();
});

test('navigating from profile "View all activity" link works', async ({ page }) => {
	await page.goto('/jimburch');
	const viewAllLink = page.getByRole('link', { name: /view all activity/i });
	if (await viewAllLink.isVisible()) {
		await viewAllLink.click();
		await expect(page).toHaveURL(/\/jimburch\/activity/);
		await expect(page.getByTestId('activity-username')).toBeVisible();
	}
});
