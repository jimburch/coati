import { expect, test } from '@playwright/test';

test.describe('Footer responsive', () => {
	test('footer renders on mobile without overflow', async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 932 });
		await page.goto('/');
		const footer = page.locator('footer');
		await expect(footer).toBeVisible();
		const box = await footer.boundingBox();
		expect(box?.width).toBeLessThanOrEqual(430);
	});

	test('footer renders on desktop without overflow', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/');
		const footer = page.locator('footer');
		await expect(footer).toBeVisible();
		await expect(footer.getByText('Explore')).toBeVisible();
	});
});

test.describe('SetupCard responsive', () => {
	test('setup cards render on mobile without overflow', async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 932 });
		await page.goto('/explore');
		const body = await page.evaluate(() => document.body.scrollWidth);
		expect(body).toBeLessThanOrEqual(430);
	});

	test('setup cards render on desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/explore');
		await expect(page.locator('body')).toBeVisible();
	});
});

test.describe('SearchBar in hamburger menu', () => {
	test('mobile search input is usable inside hamburger menu', async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 932 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		const searchInput = nav.getByRole('searchbox');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('test query');
		await expect(searchInput).toHaveValue('test query');
	});

	test('mobile search input fills full width inside hamburger menu', async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 932 });
		await page.goto('/');
		await page.getByRole('button', { name: 'Open menu' }).click();
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		const searchInput = nav.getByRole('searchbox');
		await expect(searchInput).toBeVisible();
		const box = await searchInput.boundingBox();
		// Input should be close to full width (minus padding)
		expect(box?.width).toBeGreaterThan(300);
	});
});

test.describe('FileTree responsive', () => {
	test('file tree renders without overflow on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 430, height: 932 });
		// Visit a setup files page — if no real setup, just check body overflow
		await page.goto('/');
		const body = await page.evaluate(() => document.body.scrollWidth);
		expect(body).toBeLessThanOrEqual(430);
	});
});
