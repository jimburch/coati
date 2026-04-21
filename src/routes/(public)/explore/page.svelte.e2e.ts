import { expect, test } from '@playwright/test';

const EXPLORE_URL = '/explore';

function mainSearch(page: import('@playwright/test').Page) {
	return page.locator('main').getByRole('searchbox', { name: 'Search setups...' });
}

test('renders header, result count, search input, and sort trigger', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
	await expect(page.locator('main span', { hasText: /setup/ })).toBeVisible();
	await expect(mainSearch(page)).toBeVisible();
	// Sort is a shadcn Select rendered as <button> with the current label
	await expect(
		page.locator('main').getByRole('button', { name: /Trending|Most Stars|Newest/ })
	).toBeVisible();
});

test('agent chip toggles on/off via click, activates via deep link, multi-select', async ({
	page
}) => {
	await page.goto(EXPLORE_URL);
	const chips = page.locator('main button[data-agent-slug]');
	if ((await chips.count()) === 0) {
		test.skip();
		return;
	}

	await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');

	const slug1 = await chips.first().getAttribute('data-agent-slug');
	await chips.first().click();
	await page.waitForURL(new RegExp(`agent=${slug1}`));
	await expect(page.locator(`main button[data-agent-slug="${slug1}"]`)).toHaveAttribute(
		'aria-pressed',
		'true'
	);

	if ((await chips.count()) >= 2) {
		const slug2 = await chips.nth(1).getAttribute('data-agent-slug');
		await page.locator(`main button[data-agent-slug="${slug2}"]`).click();
		await expect(page).toHaveURL(new RegExp(`agent=${slug1}`));
		await expect(page).toHaveURL(new RegExp(`agent=${slug2}`));
	}

	await page.goto(`${EXPLORE_URL}?agent=${slug1}`);
	await expect(page.locator(`main button[data-agent-slug="${slug1}"]`)).toHaveAttribute(
		'aria-pressed',
		'true'
	);
});

test('search submit updates URL with encoded q param', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const input = mainSearch(page);
	await input.fill('claude');
	await input.press('Enter');
	await expect(page).toHaveURL(/q=claude/);
});

test('active chips appear for filters and can be dismissed individually or via clear all', async ({
	page
}) => {
	await page.goto(`${EXPLORE_URL}?q=test&sort=stars`);

	const searchChip = page.locator('main a', { has: page.getByLabel('Remove search') });
	await expect(searchChip).toBeVisible();
	await expect(searchChip).toContainText('test');

	const sortChip = page.locator('main a', { has: page.getByLabel('Remove sort') });
	await expect(sortChip).toBeVisible();
	await expect(sortChip).toContainText('Most Stars');

	await expect(page.locator('main').getByText('Clear all')).toBeVisible();

	await searchChip.click();
	await expect(page).toHaveURL(/\/explore\?sort=stars$/);

	await page.goto(`${EXPLORE_URL}?q=test&sort=stars`);
	await page.locator('main').getByText('Clear all').click();
	await expect(page).toHaveURL(/\/explore$/);
});

test('empty search results show empty state with clear action', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=zzzznonexistent99999`);
	await expect(page.getByText('No setups match your filters')).toBeVisible();
	await expect(page.getByText('Clear filters')).toBeVisible();
});

test('deep link pre-fills search input and preserves filters', async ({ page }) => {
	await page.goto(`${EXPLORE_URL}?q=code&sort=stars&page=1`);
	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
	await expect(mainSearch(page)).toHaveValue('code');
});

test('setup cards render with title and author when results exist', async ({ page }) => {
	await page.goto(EXPLORE_URL);
	const cards = page.locator('main .grid a');
	if ((await cards.count()) === 0) {
		test.skip();
		return;
	}

	const firstCard = cards.first();
	await expect(firstCard).toBeVisible();

	const heading = firstCard.locator('h3');
	await expect(heading).toBeVisible();
	const text = await heading.textContent();
	expect(text?.trim().length).toBeGreaterThan(0);
});

test('mobile: heading visible, sort trigger visible, no horizontal overflow', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(EXPLORE_URL);

	await expect(page.getByRole('heading', { name: 'Explore Setups' })).toBeVisible();
	await expect(
		page.locator('main').getByRole('button', { name: /Trending|Most Stars|Newest/ })
	).toBeVisible();

	const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
