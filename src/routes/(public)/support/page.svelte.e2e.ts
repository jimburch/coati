import { expect, test } from '@playwright/test';

const SUPPORT_URL = '/support';
const BMC_URL = 'https://buymeacoffee.com/jimburch';
const GITHUB_REPO_URL = 'https://github.com/jimburch/coati';

test('page loads with correct title', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	await expect(page).toHaveTitle('Support Coati');
});

test('page renders the h1 heading', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	await expect(page.getByRole('heading', { name: 'Support Coati', level: 1 })).toBeVisible();
});

test('BMC button is visible with correct href, target, and rel', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	const bmc = page.getByTestId('bmc-button');
	await expect(bmc).toBeVisible();
	await expect(bmc).toHaveAttribute('href', BMC_URL);
	await expect(bmc).toHaveAttribute('target', '_blank');
	const rel = await bmc.getAttribute('rel');
	expect(rel).toContain('noopener');
	expect(rel).toContain('noreferrer');
});

test('all four "Other ways to help" links are present', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	await expect(page.getByRole('link', { name: 'Star the repo on GitHub' })).toHaveAttribute(
		'href',
		GITHUB_REPO_URL
	);
	await expect(page.getByRole('link', { name: "Share a setup you've built" })).toHaveAttribute(
		'href',
		'/new'
	);
	await expect(
		page.getByRole('link', { name: 'Report a bug or request a feature' })
	).toHaveAttribute('href', `${GITHUB_REPO_URL}/issues/new`);
	await expect(page.getByRole('link', { name: 'Contribute on GitHub' })).toHaveAttribute(
		'href',
		GITHUB_REPO_URL
	);
});

test('external "Other ways" links open in new tab with noopener noreferrer', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	const starLink = page.getByRole('link', { name: 'Star the repo on GitHub' });
	await expect(starLink).toHaveAttribute('target', '_blank');
	const rel = await starLink.getAttribute('rel');
	expect(rel).toContain('noopener');
	expect(rel).toContain('noreferrer');
});

test('internal "Share a setup" link does not open in a new tab', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	const shareLink = page.getByRole('link', { name: "Share a setup you've built" });
	const target = await shareLink.getAttribute('target');
	expect(target).toBeNull();
});

test('page is accessible without authentication', async ({ page }) => {
	await page.context().clearCookies();
	await page.goto(SUPPORT_URL);
	await expect(page.getByRole('heading', { name: 'Support Coati', level: 1 })).toBeVisible();
});

test('footer contains "Support" link pointing to /support', async ({ page }) => {
	await page.goto('/');
	const footerLink = page.locator('footer').getByRole('link', { name: 'Support' });
	await expect(footerLink).toBeVisible();
	await expect(footerLink).toHaveAttribute('href', '/support');
});

test('footer "Support" link navigates to /support', async ({ page }) => {
	await page.goto('/');
	await page.locator('footer').getByRole('link', { name: 'Support' }).click();
	await expect(page).toHaveURL(/\/support$/);
	await expect(page.getByRole('heading', { name: 'Support Coati', level: 1 })).toBeVisible();
});

test('mobile: page has no horizontal overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SUPPORT_URL);
	const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
