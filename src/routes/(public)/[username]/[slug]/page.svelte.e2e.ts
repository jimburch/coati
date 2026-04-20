import { expect, test, type Page } from '@playwright/test';

// Setup detail tests run against whichever setup happens to be seeded in the
// dev DB (slugs are generated). We pick the first trending setup from the
// landing page so these tests work without hard-coding unstable slugs.
async function findSeededSetupUrl(page: Page): Promise<string | null> {
	await page.goto('/');
	const trendingCard = page
		.locator('main a[href^="/"]', { has: page.locator('h3') })
		.filter({ hasText: /.+/ })
		.first();
	if ((await trendingCard.count()) === 0) return null;
	const href = await trendingCard.getAttribute('href');
	if (!href || href === '/' || href.startsWith('/explore')) return null;
	return href;
}

test('setup detail page loads with non-empty title and renders a heading', async ({ page }) => {
	const url = await findSeededSetupUrl(page);
	if (!url) {
		test.skip();
		return;
	}

	await page.goto(url);
	expect((await page.title()).length).toBeGreaterThan(0);
	await expect(page.locator('main h1').first()).toBeVisible();
});

test('setup detail page links to its /files route when files exist', async ({ page }) => {
	const url = await findSeededSetupUrl(page);
	if (!url) {
		test.skip();
		return;
	}

	await page.goto(url);
	const browseLink = page.getByRole('link', { name: /browse all/i });
	if ((await browseLink.count()) === 0) {
		test.skip();
		return;
	}
	expect(await browseLink.getAttribute('href')).toBe(`${url}/files`);
});

test('agent badges link to their /agents/{slug} pages when present', async ({ page }) => {
	const url = await findSeededSetupUrl(page);
	if (!url) {
		test.skip();
		return;
	}

	await page.goto(url);
	const agentLink = page.locator('main a[href^="/agents/"]').first();
	if ((await agentLink.count()) === 0) {
		test.skip();
		return;
	}
	expect(await agentLink.getAttribute('href')).toMatch(/^\/agents\/[\w-]+$/);
});
