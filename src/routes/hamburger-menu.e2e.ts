import { expect, test } from '@playwright/test';

test.describe('Hamburger menu (mobile)', () => {
	test.use({ viewport: { width: 430, height: 932 } });

	test('hamburger button is visible on mobile', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
	});

	test('mobile menu is closed by default', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();
	});

	test('tapping hamburger opens mobile menu', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
	});

	test('mobile menu contains Explore link', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await expect(nav.getByRole('link', { name: 'Explore' })).toBeVisible();
	});

	test('mobile menu contains search input', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await expect(page.getByRole('searchbox')).toBeVisible();
	});

	test('menu closes when hamburger is toggled again', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await page.getByRole('button', { name: 'Close menu' }).click();
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();
	});

	test('menu closes on backdrop tap', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
		// Click at bottom of screen (outside the menu panel)
		await page.mouse.click(215, 800);
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();
	});

	test('menu closes on page navigation', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await nav.getByRole('link', { name: 'Explore' }).click();
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();
	});

	test('unauthenticated user sees Sign in with GitHub in menu', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		await expect(page.getByRole('link', { name: 'Sign in with GitHub' })).toBeVisible();
	});

	test('unauthenticated user does not see Profile/Settings links in menu', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await expect(nav.getByRole('link', { name: 'My Profile' })).not.toBeVisible();
		await expect(nav.getByRole('link', { name: 'Settings' })).not.toBeVisible();
	});
});

test.describe('Desktop navbar (mobile menu hidden)', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('hamburger button is hidden on desktop', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Open menu' })).not.toBeVisible();
	});

	test('desktop Explore link is visible', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'Explore' })).toBeVisible();
	});

	test('desktop sign in button is visible for unauthenticated users', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
	});
});
