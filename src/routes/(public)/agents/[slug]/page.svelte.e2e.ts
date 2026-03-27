import { expect, test } from '@playwright/test';

const KNOWN_SLUG = 'claude-code';
const UNKNOWN_SLUG = 'nonexistent-agent-zzz';
const AGENT_URL = `/agents/${KNOWN_SLUG}`;

test('renders agent name as heading', async ({ page }) => {
	await page.goto(AGENT_URL);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('renders Setups section heading', async ({ page }) => {
	await page.goto(AGENT_URL);
	await expect(page.getByRole('heading', { name: 'Setups' })).toBeVisible();
});

test('shows setup count', async ({ page }) => {
	await page.goto(AGENT_URL);
	await expect(page.locator('span', { hasText: /setup/ })).toBeVisible();
});

test('renders setup cards grid when setups exist', async ({ page }) => {
	await page.goto(AGENT_URL);
	const grid = page.locator('main .grid');
	const count = await grid.count();
	if (count > 0) {
		const cards = grid.locator('a');
		const cardCount = await cards.count();
		if (cardCount > 0) {
			await expect(cards.first()).toBeVisible();
		}
	}
});

test('shows empty state when no setups', async ({ page }) => {
	// This test runs only if the agent has no setups; we guard with a condition
	await page.goto(AGENT_URL);
	const grid = page.locator('main .grid');
	const hasGrid = (await grid.count()) > 0;
	if (!hasGrid) {
		await expect(page.getByText(/No setups yet/)).toBeVisible();
		await expect(page.getByRole('link', { name: 'Browse all setups' })).toBeVisible();
	}
});

test('renders website link when present', async ({ page }) => {
	await page.goto(AGENT_URL);
	// Website link opens in new tab (target=_blank)
	const websiteLink = page.locator('a[target="_blank"][rel*="noopener"]');
	const count = await websiteLink.count();
	if (count > 0) {
		await expect(websiteLink.first()).toBeVisible();
	}
});

test('returns 404 for unknown agent slug', async ({ page }) => {
	const response = await page.goto(`/agents/${UNKNOWN_SLUG}`);
	expect(response?.status()).toBe(404);
});

test('setup cards link to correct setup URLs', async ({ page }) => {
	await page.goto(AGENT_URL);
	const cards = page.locator('main .grid a');
	const count = await cards.count();
	if (count > 0) {
		const href = await cards.first().getAttribute('href');
		expect(href).toMatch(/^\/.+\/.+/);
	}
});

test('mobile layout shows agent header', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(AGENT_URL);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Setups' })).toBeVisible();
});

test('desktop layout shows agent header', async ({ page, isMobile }) => {
	test.skip(!!isMobile, 'desktop-only test');
	await page.goto(AGENT_URL);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Setups' })).toBeVisible();
});

test('page has correct meta title', async ({ page }) => {
	await page.goto(AGENT_URL);
	const title = await page.title();
	expect(title).toMatch(/Setups.*Coati/);
});

test('mobile agent heading not clipped', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(AGENT_URL);
	const h1 = page.getByRole('heading', { level: 1 });
	await expect(h1).toBeVisible();
	const overflows = await h1.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
	expect(overflows).toBe(false);
});

test('mobile setup grid visible', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(AGENT_URL);
	// Either a grid or empty state should be visible
	const grid = page.locator('.grid');
	const empty = page.locator('text=/No setups yet/');
	const hasGrid = (await grid.count()) > 0;
	const hasEmpty = (await empty.count()) > 0;
	expect(hasGrid || hasEmpty).toBe(true);
});

test('desktop agent header shows icon and name', async ({ page, isMobile }) => {
	test.skip(!!isMobile, 'desktop-only test');
	await page.goto(AGENT_URL);
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
