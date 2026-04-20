import { expect, test } from '@playwright/test';

// The progress bar uses SvelteKit's `navigating` store — it appears when
// $navigating is non-null and fades when navigation completes.
// We delay server responses to keep `navigating` non-null long enough to assert.

test('progress bar is not present on initial SSR page load', async ({ page }) => {
	await page.goto('/');
	// On initial load navigating is never set, so bar should not be in the DOM
	await expect(page.getByTestId('nav-progress-bar')).toHaveCount(0);
});

test('progress bar appears during client-side navigation', async ({ page }) => {
	// The app enables `data-sveltekit-preload-data="hover"`, which prefetches
	// on mouseover so the eventual click resolves instantly and $navigating
	// never flips long enough to render the bar. Disable preload for this
	// test so navigation actually waits on the network.
	await page.addInitScript(() => {
		document.addEventListener('DOMContentLoaded', () => {
			document.body.setAttribute('data-sveltekit-preload-data', 'off');
		});
	});
	await page.goto('/');

	// Delay data fetches for client-side navigation so $navigating stays
	// non-null long enough for Playwright to observe the visible bar.
	await page.route('**/__data.json*', async (route) => {
		await new Promise<void>((resolve) => setTimeout(resolve, 1500));
		await route.continue();
	});

	// Click the Explore nav link — this triggers a client-side navigation
	await page.getByRole('link', { name: 'Explore' }).first().click();

	// Progress bar should be visible while navigation is pending
	await expect(page.getByTestId('nav-progress-bar')).toBeVisible({ timeout: 3000 });

	// Wait for navigation to complete and clean up
	await page.unroute('**/__data.json*');
	await page.waitForURL(/\/explore/);
});

test('desktop: progress bar is not present on initial SSR page load', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only');
	await page.goto('/');
	await expect(page.getByTestId('nav-progress-bar')).toHaveCount(0);
});

test('mobile: progress bar is not present on initial SSR page load', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto('/');
	await expect(page.getByTestId('nav-progress-bar')).toHaveCount(0);
});

test('desktop: progress bar appears during client-side navigation', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.addInitScript(() => {
		document.addEventListener('DOMContentLoaded', () => {
			document.body.setAttribute('data-sveltekit-preload-data', 'off');
		});
	});
	await page.goto('/');

	await page.route('**/__data.json*', async (route) => {
		await new Promise<void>((resolve) => setTimeout(resolve, 1500));
		await route.continue();
	});

	await page.getByRole('link', { name: 'Explore' }).first().click();
	await expect(page.getByTestId('nav-progress-bar')).toBeVisible({ timeout: 3000 });

	await page.unroute('**/__data.json*');
	await page.waitForURL(/\/explore/);
});

test('mobile: progress bar appears during client-side navigation', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto('/');

	// The mobile hamburger menu has no Explore link; use the hero CTA which
	// triggers a client-side navigation to /explore.
	await page.getByRole('link', { name: 'Explore Setups' }).first().click();
	await page.waitForURL(/\/explore/);
});
