import { expect, test } from '@playwright/test';

const ACTIVITY_URL = '/jimburch/activity';

test('activity page renders header, title, feed-or-empty state', async ({ page }) => {
	await page.goto(ACTIVITY_URL);
	await expect(page).toHaveTitle(/jimburch.*activity/i);

	const username = page.getByTestId('activity-username');
	await expect(username).toBeVisible();
	await expect(username).toHaveText('jimburch');
	await expect(username).toHaveAttribute('href', '/jimburch');

	const hasFeed = await page.getByTestId('feed-list').isVisible();
	const hasEmpty = await page.getByTestId('feed-empty').isVisible();
	expect(hasFeed || hasEmpty).toBe(true);
});

test('load more button loads additional items when present', async ({ page }) => {
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
	expect(await feedList.locator('> *').count()).toBeGreaterThan(initialItems);
});

test('profile "View all activity" link navigates to activity page', async ({ page }) => {
	await page.goto('/jimburch');
	const viewAllLink = page.getByRole('link', { name: /view all activity/i });
	if (!(await viewAllLink.isVisible())) {
		test.skip();
		return;
	}
	await viewAllLink.click();
	await expect(page).toHaveURL(/\/jimburch\/activity/);
	await expect(page.getByTestId('activity-username')).toBeVisible();
});
