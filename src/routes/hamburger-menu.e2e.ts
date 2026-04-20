import { expect, test, type Page } from '@playwright/test';

// On the first interaction after SSR, the hamburger click can race Svelte
// hydration: Playwright delivers the mouse event before the onclick handler
// has attached. Wait for network idle (proxy for hydration complete) and
// click; if the nav still doesn't appear, click again.
async function openMobileMenu(page: Page) {
	await page.waitForLoadState('networkidle');
	const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
	await page.getByRole('button', { name: 'Open menu' }).click();
	try {
		await expect(nav).toBeVisible({ timeout: 1500 });
	} catch {
		// First click was pre-hydration; the button still reads "Open menu"
		// because the handler never ran. Click again — hydration is done now.
		await page.getByRole('button', { name: 'Open menu' }).click();
		await expect(nav).toBeVisible();
	}
}

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
		await openMobileMenu(page);
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
	});

	test('menu closes when hamburger is toggled again', async ({ page }) => {
		await page.goto('/');
		await openMobileMenu(page);
		await page.getByRole('button', { name: 'Close menu' }).click();
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();
	});

	test('menu closes on backdrop tap', async ({ page }) => {
		await page.goto('/');
		await openMobileMenu(page);
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
		// Click at bottom of screen (outside the menu panel)
		await page.mouse.click(215, 800);
		await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).not.toBeVisible();
	});

	test('menu closes on page navigation', async ({ page }) => {
		// Intercept the GitHub OAuth kickoff so clicking Sign in triggers a
		// same-origin client-side navigation instead of going to github.com.
		await page.route('**/auth/login/github', (route) =>
			route.fulfill({ status: 302, headers: { location: '/' } })
		);
		await page.goto('/');
		await openMobileMenu(page);
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await expect(nav).toBeVisible();
		await nav.getByRole('link', { name: 'Sign in with GitHub' }).click();
		await expect(nav).not.toBeVisible();
	});

	test('unauthenticated user sees Sign in with GitHub in menu', async ({ page }) => {
		await page.goto('/');
		await openMobileMenu(page);
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await expect(nav.getByRole('link', { name: 'Sign in with GitHub' })).toBeVisible();
	});

	test('unauthenticated user does not see Profile/Settings links in menu', async ({ page }) => {
		await page.goto('/');
		await openMobileMenu(page);
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await expect(nav.getByRole('link', { name: 'My Profile' })).not.toBeVisible();
		await expect(nav.getByRole('link', { name: 'Settings' })).not.toBeVisible();
	});

	test('mobile menu does not contain a Feed link', async ({ page }) => {
		await page.goto('/');
		await openMobileMenu(page);
		const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
		await expect(nav.getByRole('link', { name: /^Feed$/i })).not.toBeAttached();
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
		await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
	});

	test('desktop navbar does not contain a Feed link', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: /^Feed$/i })).not.toBeAttached();
	});
});
