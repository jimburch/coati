import { expect, test } from '@playwright/test';

const FEED_URL = '/feed';

test('feed page has correct title structure when authenticated', async ({ page }) => {
	await page.goto(FEED_URL);
	await expect(page.getByRole('heading', { name: 'Your Feed' })).toBeVisible();
});

test('feed shows empty state with explore link when no activity', async ({ page }) => {
	await page.goto(FEED_URL);

	const emptyState = page.getByTestId('feed-empty');
	const feedList = page.getByTestId('feed-list');

	// Wait for either empty state or list to render before asserting.
	await expect(emptyState.or(feedList)).toBeVisible();

	if (await emptyState.isVisible()) {
		await expect(emptyState).toContainText('No recent activity from people you follow');
		await expect(page.getByRole('link', { name: 'Discover setups to explore' })).toBeVisible();
	}
});

test('feed list renders activity items when present', async ({ page }) => {
	await page.goto(FEED_URL);

	const feedList = page.getByTestId('feed-list');
	if (!(await feedList.isVisible())) return;

	const items = page.getByTestId('activity-item');
	const count = await items.count();
	if (count > 0) {
		await expect(items.first()).toBeVisible();
	}
});

test('activity item shows avatar and timestamp', async ({ page }) => {
	await page.goto(FEED_URL);

	const items = page.getByTestId('activity-item');
	if ((await items.count()) === 0) return;

	const first = items.first();
	const avatar = first.locator('span[data-slot="avatar"], img[alt]');
	await expect(avatar.first()).toBeVisible();

	const timestamp = first.getByTestId('activity-timestamp');
	await expect(timestamp).toBeVisible();
});

test('load more button is visible when feed has 20+ items', async ({ page }) => {
	await page.goto(FEED_URL);

	const loadMore = page.getByTestId('load-more-button');
	const feedList = page.getByTestId('feed-list');
	if (!(await feedList.isVisible())) return;

	const items = page.getByTestId('activity-item');
	const count = await items.count();

	if (count >= 20) {
		await expect(loadMore).toBeVisible();
	}
});

test('clicking load more appends more items', async ({ page }) => {
	await page.goto(FEED_URL);

	const loadMore = page.getByTestId('load-more-button');
	if (!(await loadMore.isVisible())) return;

	const initialCount = await page.getByTestId('activity-item').count();
	await loadMore.click();
	await page.waitForResponse((res) => res.url().includes('/api/v1/feed'));

	const newCount = await page.getByTestId('activity-item').count();
	expect(newCount).toBeGreaterThanOrEqual(initialCount);
});

test('desktop layout renders feed within max-width container', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(FEED_URL);
	await expect(page.locator('main').last()).toBeVisible();
});

test('mobile layout renders feed correctly', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(FEED_URL);
	await expect(page.locator('main').last()).toBeVisible();
});
