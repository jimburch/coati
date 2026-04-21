import { expect, test } from '@playwright/test';

// A route that doesn't exist under (public)/[username]/[slug] — triggers the (public) error boundary
const NOT_FOUND_URL = '/this-user-does-not-exist-xyz/this-setup-does-not-exist-xyz';

test('public 404 renders nav, logo, heading, status, and navigation actions', async ({ page }) => {
	await page.goto(NOT_FOUND_URL);
	await expect(page.locator('header')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Coati', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
	await expect(page.getByText('404')).toBeVisible();

	const goHome = page.getByRole('link', { name: 'Go home' });
	await expect(goHome).toBeVisible();
	await expect(goHome).toHaveAttribute('href', '/');
	await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
});
