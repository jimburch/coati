import { expect, test } from '@playwright/test';

const EXPLORE_URL = '/explore';

// Helper: get the main content search input (not the navbar one)
function mainSearch(page: import('@playwright/test').Page) {
	return page.locator('main').getByRole('searchbox', { name: 'Search setups...' });
}

test('renders page header and result count', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
	await expect(page.locator('main span', { hasText: /setup/ })).toBeVisible();
});

test('renders search input in main content', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	await expect(mainSearch(page)).toBeVisible();
});

test('renders agent filter chips', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	const count = await chips.count();
	// If agents exist in the DB, chips should be visible
	if (count > 0) {
		await expect(chips.first()).toBeVisible();
	}
});

test('agent chip toggles active state on click', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	const count = await chips.count();
	if (count === 0) return;

	const chip = chips.first();
	const slug = await chip.getAttribute('data-agent-slug');
	await chip.click();
	await expect(page).toHaveURL(new RegExp(`agent=${slug}`));
	// chip should now be pressed
	await expect(page.locator(`main button[data-agent-slug="${slug}"]`)).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('clicking active agent chip removes it from URL', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	if ((await chips.count()) === 0) return;

	const chip = chips.first();
	const slug = await chip.getAttribute('data-agent-slug');
	// Select then deselect
	await chip.click();
	await page.waitForURL(new RegExp(`agent=${slug}`));
	await page.locator(`main button[data-agent-slug="${slug}"]`).click();
	await expect(page).not.toHaveURL(new RegExp(`agent=${slug}`));
});

test('multiple agent chips can be selected', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	if ((await chips.count()) < 2) return;

	const slug1 = await chips.nth(0).getAttribute('data-agent-slug');
	const slug2 = await chips.nth(1).getAttribute('data-agent-slug');
	await chips.nth(0).click();
	await page.waitForURL(new RegExp(`agent=${slug1}`));
	await page.locator(`main button[data-agent-slug="${slug2}"]`).click();
	await expect(page).toHaveURL(new RegExp(`agent=${slug1}`));
	await expect(page).toHaveURL(new RegExp(`agent=${slug2}`));
});

test('renders filter dropdowns', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const selects = page.locator('main select');
	await expect(selects).toHaveCount(2);
});

test('sort dropdown has correct options', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const sortSelect = page.locator('main select').last();
	const options = sortSelect.locator('option');
	await expect(options.nth(0)).toHaveText('Newest');
	await expect(options.nth(1)).toHaveText('Trending');
	await expect(options.nth(2)).toHaveText('Most Stars');
	await expect(options.nth(3)).toHaveText('Most Clones');
});

test('displays setup cards in grid', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const cards = page.locator('main .grid a');
	const count = await cards.count();
	if (count > 0) {
		await expect(cards.first()).toBeVisible();
	}
});

test('search navigates to URL with q param', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const searchInput = mainSearch(page);
	await searchInput.fill('claude');
	await searchInput.press('Enter');
	await expect(page).toHaveURL(/q=claude/);
});

test('search with no results shows empty state', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=zzzznonexistent99999`);
	await expect(page.getByText('No setups match your filters')).toBeVisible();
	await expect(page.getByText('Clear filters')).toBeVisible();
});

test('sort param updates URL on change', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const sortSelect = page.locator('main select').last();
	await sortSelect.selectOption('stars');
	await expect(page).toHaveURL(/sort=stars/);
});

test('sort=newest is default and not shown in URL', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const sortSelect = page.locator('main select').last();
	await expect(sortSelect).toHaveValue('newest');
	expect(page.url()).not.toContain('sort=');
});

test('active filter chip appears for search query', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=test`);
	// Chip should contain the search term and × to dismiss
	const chip = page.locator('main a').filter({ hasText: '\u00d7' }).filter({ hasText: 'test' });
	await expect(chip.first()).toBeVisible();
});

test('active sort chip appears for non-default sort', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?sort=stars`);
	// Chip link should show the sort label with × dismiss
	const sortChip = page.locator('main a').filter({ hasText: 'Most Stars' });
	await expect(sortChip.first()).toBeVisible();
	await expect(page.locator('main').getByText('Clear all')).toBeVisible();
});

test('clear all link resets to /explore', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=test&sort=stars`);
	await page.locator('main').getByText('Clear all').click();
	await expect(page).toHaveURL(/\/explore$/);
});

test('deep link with multiple params works', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=code&sort=stars&page=1`);
	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
	await expect(mainSearch(page)).toHaveValue('code');
	const sortSelect = page.locator('main select').last();
	await expect(sortSelect).toHaveValue('stars');
});

test('clicking search chip removes q param', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=test&sort=stars`);
	const searchChip = page
		.locator('main a')
		.filter({ hasText: '\u00d7' })
		.filter({ hasText: 'test' });
	await searchChip.first().click();
	await expect(page).toHaveURL(/\/explore\?sort=stars$/);
});

test('clicking sort chip removes sort param', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?sort=stars`);
	const sortChip = page
		.locator('main a')
		.filter({ hasText: '\u00d7' })
		.filter({ hasText: 'Most Stars' });
	await sortChip.first().click();
	await expect(page).toHaveURL(/\/explore$/);
});

test('agent chip shows aria-pressed=false when not selected', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	if ((await chips.count()) === 0) return;
	await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');
});

test('deep link with agent param activates chip', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	if ((await chips.count()) === 0) return;
	const slug = await chips.first().getAttribute('data-agent-slug');
	await page.goto(`${EXPLORE_URL}?agent=${slug}`);
	await expect(page.locator(`main button[data-agent-slug="${slug}"]`)).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('mobile layout wraps filters', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(EXPLORE_URL);
	const selects = page.locator('main select');
	await expect(selects).toHaveCount(2);
	for (let i = 0; i < 2; i++) {
		await expect(selects.nth(i)).toBeVisible();
	}
});

test('setup cards show author name', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const cards = page.locator('main .grid a');
	const count = await cards.count();
	if (count > 0) {
		// Author is shown as avatar + username in the stats footer
		const authorSpan = cards.first().locator('span.ml-auto img, span.ml-auto span');
		await expect(authorSpan.first()).toBeVisible();
	}
});

test('mobile: heading is visible and page has no horizontal overflow', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(EXPLORE_URL);
	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
	// Page should not overflow horizontally
	const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test('mobile: filter selects are visible and usable', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(EXPLORE_URL);
	const selects = page.locator('main select');
	await expect(selects).toHaveCount(2);
	// Both selects are visible on mobile
	await expect(selects.nth(0)).toBeVisible();
	await expect(selects.nth(1)).toBeVisible();
});

test('mobile: pagination is usable without overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(EXPLORE_URL);
	const nav = page.locator('nav[aria-label="Pagination"]');
	const exists = (await nav.count()) > 0;
	if (exists) {
		await expect(nav).toBeVisible();
		// Pagination should not cause overflow
		const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
		const viewportWidth = await page.evaluate(() => window.innerWidth);
		expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
	}
});

test('desktop: heading renders at full size', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(EXPLORE_URL);
	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
});
