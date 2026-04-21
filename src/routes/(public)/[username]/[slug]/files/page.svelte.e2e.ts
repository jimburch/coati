import { expect, test, type Page } from '@playwright/test';

// File-browser tests use whichever setup happens to be seeded in the dev DB.
async function findSeededFilesUrl(page: Page): Promise<string | null> {
	await page.goto('/');
	const trendingCard = page
		.locator('main a[href^="/"]', { has: page.locator('h3') })
		.filter({ hasText: /.+/ })
		.first();
	if ((await trendingCard.count()) === 0) return null;
	const href = await trendingCard.getAttribute('href');
	if (!href || href === '/' || href.startsWith('/explore')) return null;
	return `${href}/files`;
}

test('desktop: file browser renders tree, viewer with line count, and code', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only; mobile tree covered by toggle test below');
	const filesUrl = await findSeededFilesUrl(page);
	if (!filesUrl) {
		test.skip();
		return;
	}

	await page.goto(filesUrl);
	await expect(page.locator('aside nav')).toBeVisible();
	await expect(page.getByText(/\d+ lines?/)).toBeVisible();
	await expect(page.locator('code').first()).toBeVisible();
});

test('desktop: clicking a file in the tree updates URL and re-renders the viewer', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only');
	const filesUrl = await findSeededFilesUrl(page);
	if (!filesUrl) {
		test.skip();
		return;
	}

	await page.goto(filesUrl);
	const fileLinks = page.locator('aside nav a[href*="?file="]');
	if ((await fileLinks.count()) === 0) {
		test.skip();
		return;
	}

	await fileLinks.first().click();
	await expect(page).toHaveURL(/\?file=/);
	await expect(page.getByText(/\d+ lines?/)).toBeVisible();
});

test('mobile: file-tree toggle reveals and hides the tree', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	const filesUrl = await findSeededFilesUrl(page);
	if (!filesUrl) {
		test.skip();
		return;
	}

	await page.goto(filesUrl);
	await expect(page.locator('aside')).toBeHidden();

	const show = page.getByRole('button', { name: /show files/i });
	await expect(show).toBeVisible();
	await show.click();

	const hide = page.getByRole('button', { name: /hide files/i });
	await expect(hide).toBeVisible();

	await hide.click();
	await expect(page.getByRole('button', { name: /show files/i })).toBeVisible();
});
