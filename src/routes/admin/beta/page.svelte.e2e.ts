import { test, expect } from '@playwright/test';

test('unauthenticated visitors are redirected away from /admin/beta without a 500', async ({
	page
}) => {
	const response = await page.goto('/admin/beta');
	const status = response?.status() ?? 0;

	// Either the URL was redirected away, or a 302/403 status was returned — not a 500
	expect(page.url().includes('/admin/beta') === false || status === 302 || status === 403).toBe(
		true
	);

	const body = (await page.locator('body').textContent()) ?? '';
	expect(body).not.toContain('Internal Server Error');
	expect(body).not.toContain('Unexpected error');
});

test('admin beta handles query params gracefully (no crash)', async ({ page }) => {
	await page.goto('/admin/beta?q=alice');
	const body = (await page.locator('body').textContent()) ?? '';
	expect(body).not.toContain('Internal Server Error');
	expect(body).not.toContain('Unexpected error');
});
