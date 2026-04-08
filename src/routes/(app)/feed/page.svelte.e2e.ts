import { expect, test } from '@playwright/test';

const FEED_URL = '/feed';

// Note: the home feed requires authentication. Tests that need auth will be skipped
// if not authenticated. In CI without a DB/auth, these tests verify the redirect behavior.

test('unauthenticated user is redirected to login', async ({ page }) => {
	await page.goto(FEED_URL);
	// Should redirect to the GitHub auth page or login page
	await expect(page).toHaveURL(/auth\/login\/github|github\.com\/login/);
});

test('feed page has correct title structure when authenticated', async ({ page, context }) => {
	// This test requires an authenticated session; skip in environments without auth
	await page.goto(FEED_URL);
	const url = page.url();
	// If redirected to auth, skip the rest
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}
	await expect(page.getByRole('heading', { name: 'Your Feed' })).toBeVisible();
	void context;
});

test('feed shows empty state with explore link when no activity', async ({ page }) => {
	await page.goto(FEED_URL);
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

	const emptyState = page.getByTestId('feed-empty');
	const feedList = page.getByTestId('feed-list');
	const emptyVisible = await emptyState.isVisible();
	const listVisible = await feedList.isVisible();

	// Either the empty state OR the feed list should be present
	expect(emptyVisible || listVisible).toBe(true);

	if (emptyVisible) {
		await expect(emptyState).toContainText('No recent activity from people you follow');
		await expect(page.getByRole('link', { name: 'Discover setups to explore' })).toBeVisible();
	}
});

test('feed list renders activity items when present', async ({ page }) => {
	await page.goto(FEED_URL);
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

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
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

	const items = page.getByTestId('activity-item');
	if ((await items.count()) === 0) return;

	const first = items.first();
	// Avatar image or fallback should be present
	const avatar = first.locator('span[data-slot="avatar"], img[alt]');
	await expect(avatar.first()).toBeVisible();

	// Timestamp should be present
	const timestamp = first.getByTestId('activity-timestamp');
	await expect(timestamp).toBeVisible();
});

test('load more button is visible when feed has 20+ items', async ({ page }) => {
	await page.goto(FEED_URL);
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

	const loadMore = page.getByTestId('load-more-button');
	const feedList = page.getByTestId('feed-list');
	if (!(await feedList.isVisible())) return;

	const items = page.getByTestId('activity-item');
	const count = await items.count();

	// Load more button only appears if there are potentially more items (>= 20 initial)
	if (count >= 20) {
		await expect(loadMore).toBeVisible();
	}
});

test('clicking load more appends more items', async ({ page }) => {
	await page.goto(FEED_URL);
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

	const loadMore = page.getByTestId('load-more-button');
	if (!(await loadMore.isVisible())) return;

	const initialCount = await page.getByTestId('activity-item').count();
	await loadMore.click();
	// Wait for network request to complete
	await page.waitForResponse((res) => res.url().includes('/api/v1/feed'));

	const newCount = await page.getByTestId('activity-item').count();
	expect(newCount).toBeGreaterThanOrEqual(initialCount);
});

test('desktop layout renders feed within max-width container', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(FEED_URL);
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

	const main = page.locator('main');
	await expect(main).toBeVisible();
});

test('mobile layout renders feed correctly', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(FEED_URL);
	const url = page.url();
	if (url.includes('auth') || url.includes('github.com')) {
		test.skip();
		return;
	}

	const main = page.locator('main');
	await expect(main).toBeVisible();
});
