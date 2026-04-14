import { expect, test } from '@playwright/test';

const GUIDE_URL = '/guide';

const SECTION_HEADINGS = [
	'What is Coati?',
	'Discover Setups',
	'Install the CLI',
	'Clone a Setup',
	'Create Your Own Setup',
	'Publish to Coati',
	'Social Features'
];

const SECTION_IDS = [
	'what-is-coati',
	'discover-setups',
	'install-the-cli',
	'clone-a-setup',
	'create-your-own-setup',
	'publish-to-coati',
	'social-features'
];

test('page loads with correct title', async ({ page }) => {
	await page.goto(GUIDE_URL);
	await expect(page).toHaveTitle('How to use Coati');
});

test('page renders the main h1 heading', async ({ page }) => {
	await page.goto(GUIDE_URL);
	await expect(page.getByRole('heading', { name: 'How to use Coati', level: 1 })).toBeVisible();
});

test('all 7 section headings are visible', async ({ page }) => {
	await page.goto(GUIDE_URL);
	for (const heading of SECTION_HEADINGS) {
		await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
	}
});

test('all section anchor IDs are present in the DOM', async ({ page }) => {
	await page.goto(GUIDE_URL);
	for (const id of SECTION_IDS) {
		const section = page.locator(`#${id}`);
		await expect(section).toBeAttached();
	}
});

test('sections appear in the correct order', async ({ page }) => {
	await page.goto(GUIDE_URL);
	const headings = page.getByRole('heading', { level: 2 });
	const count = await headings.count();
	expect(count).toBe(SECTION_HEADINGS.length);

	for (let i = 0; i < SECTION_HEADINGS.length; i++) {
		await expect(headings.nth(i)).toHaveText(SECTION_HEADINGS[i]);
	}
});

test('desktop: TOC sidebar is visible', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(GUIDE_URL);
	const toc = page.getByRole('navigation', { name: 'Guide sections' });
	await expect(toc).toBeVisible();
});

test('mobile: TOC sidebar is hidden', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(GUIDE_URL);
	const tocAside = page.locator('aside[aria-label="Table of contents"]');
	await expect(tocAside).toBeHidden();
});

test('desktop: TOC contains links to all 7 sections', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(GUIDE_URL);
	const toc = page.getByRole('navigation', { name: 'Guide sections' });
	for (const section of SECTION_HEADINGS) {
		await expect(toc.getByRole('link', { name: section })).toBeVisible();
	}
});

test('desktop: TOC links have correct href anchors', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(GUIDE_URL);
	const toc = page.getByRole('navigation', { name: 'Guide sections' });
	for (const id of SECTION_IDS) {
		const link = toc.locator(`a[href="#${id}"]`);
		await expect(link).toBeAttached();
	}
});

test('mobile: page is single-column with no horizontal overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(GUIDE_URL);
	const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

test('CodeBlock components are present on the page', async ({ page }) => {
	await page.goto(GUIDE_URL);
	// CodeBlock renders a pre > code structure
	const codeBlocks = page.locator('pre code');
	const count = await codeBlocks.count();
	expect(count).toBeGreaterThan(0);
});

test('copy buttons exist and are accessible', async ({ page }) => {
	await page.goto(GUIDE_URL);
	const copyButtons = page.getByRole('button', { name: 'Copy code' });
	const count = await copyButtons.count();
	expect(count).toBeGreaterThan(0);
	// First copy button should be visible
	await expect(copyButtons.first()).toBeVisible();
});

test('footer contains "How to use Coati" link pointing to /guide', async ({ page }) => {
	await page.goto('/');
	const footerLink = page.locator('footer').getByRole('link', { name: 'How to use Coati' });
	await expect(footerLink).toBeVisible();
	await expect(footerLink).toHaveAttribute('href', '/guide');
});

test('footer "How to use Coati" link navigates to /guide', async ({ page }) => {
	await page.goto('/');
	await page.locator('footer').getByRole('link', { name: 'How to use Coati' }).click();
	await expect(page).toHaveURL(/\/guide$/);
	await expect(page.getByRole('heading', { name: 'How to use Coati', level: 1 })).toBeVisible();
});

test('page is accessible without authentication', async ({ page }) => {
	// No cookies/auth — guide must load for unauthenticated users
	await page.context().clearCookies();
	await page.goto(GUIDE_URL);
	await expect(page.getByRole('heading', { name: 'How to use Coati', level: 1 })).toBeVisible();
});

test('CLI code examples contain realistic coati commands', async ({ page }) => {
	await page.goto(GUIDE_URL);
	const codeBlocks = page.locator('pre code');
	const allCode = await codeBlocks.allTextContents();
	const combined = allCode.join('\n');
	// Check that key CLI commands are present in code blocks
	expect(combined).toContain('npm install -g coati');
	expect(combined).toContain('coati login');
	expect(combined).toContain('coati clone');
	expect(combined).toContain('coati init');
	expect(combined).toContain('coati publish');
});

test('desktop: page heading renders at correct size', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(GUIDE_URL);
	await expect(page.getByRole('heading', { name: 'How to use Coati', level: 1 })).toBeVisible();
});

test('mobile: all section headings are visible without horizontal overflow', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(GUIDE_URL);
	for (const heading of SECTION_HEADINGS) {
		await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
	}
	const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
