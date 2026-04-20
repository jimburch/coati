import { expect, test, type Page } from '@playwright/test';

// These tests require an authenticated session. Unauthenticated visitors see
// the marketing landing page at /; each test detects that state and skips.

const HOME = '/';

function isAuthRedirect(url: string): boolean {
	return url.includes('/auth/login') || url.includes('github.com/login');
}

async function isUnauthenticated(page: Page): Promise<boolean> {
	if (isAuthRedirect(page.url())) return true;
	// Marketing landing renders a "Sign in with GitHub" CTA instead of the dashboard
	return (await page.getByRole('link', { name: 'Sign in with GitHub' }).count()) > 0;
}

test('authenticated home page renders core sections (profile, tabs, quick actions, stats, activity)', async ({
	page
}) => {
	await page.goto(HOME);
	if (await isUnauthenticated(page)) {
		test.skip();
		return;
	}

	await expect(page.getByTestId('profile-card')).toBeVisible();
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await expect(page.getByTestId('quick-actions')).toBeVisible();
	await expect(page.getByTestId('stats-grid')).toBeVisible();

	const panel = page.getByTestId('activity-panel');
	await expect(panel).toBeVisible();

	// See-all link is only rendered when there are feed items
	const seeAll = panel.getByTestId('see-all-link');
	if ((await seeAll.count()) > 0) {
		await expect(seeAll).toHaveAttribute('href', '/feed');
	}
});

test('user with setups: YourSetupsList and optional AgentChips render', async ({ page }) => {
	await page.goto(HOME);
	if (await isUnauthenticated(page)) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) === 0) {
		test.skip();
		return;
	}

	await expect(page.getByTestId('your-setups-list')).toBeVisible();
	await expect(page.getByTestId('stats-grid')).toBeVisible();

	const agentChips = page.getByTestId('agent-chips');
	if ((await agentChips.count()) > 0) {
		await expect(agentChips).toBeVisible();
	}
});

test('zero-state user: stats grid shown, setups list and agent chips absent', async ({ page }) => {
	await page.goto(HOME);
	if (await isUnauthenticated(page)) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}

	await expect(page.getByTestId('stats-grid')).toBeVisible();
	await expect(page.getByTestId('your-setups-list')).not.toBeVisible();
	await expect(page.getByTestId('agent-chips')).not.toBeVisible();
	await expect(page.getByTestId('activity-panel')).toBeVisible();

	await page.goto(`${HOME}?tab=following`);
	if (await isUnauthenticated(page)) return;
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await expect(page.getByText('Follow people to see their setups here.')).toBeVisible();
});

test('tab switching: Trending/Following/For You update URL and remain active on reload', async ({
	page
}) => {
	await page.goto(HOME);
	if (await isUnauthenticated(page)) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();

	await page.getByRole('link', { name: 'Trending' }).click();
	await expect(page).toHaveURL(/[?&]tab=trending/);

	await page.getByRole('link', { name: 'Following' }).click();
	await expect(page).toHaveURL(/[?&]tab=following/);

	await page.getByRole('link', { name: 'For You' }).click();
	await expect(page).toHaveURL(/[?&]tab=for-you/);

	// Reload-with-tab-param keeps the right tab active
	await page.goto(`${HOME}?tab=trending`);
	await expect(page.getByRole('link', { name: 'Trending' })).toHaveAttribute(
		'aria-current',
		'page'
	);

	await page.goto(HOME);
	await expect(page.getByRole('link', { name: 'For You' })).toHaveAttribute('aria-current', 'page');
});

test('mobile: sections stack in order profile → discovery → quick actions', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(HOME);
	if (await isUnauthenticated(page)) {
		test.skip();
		return;
	}

	const profile = page.getByTestId('profile-card');
	const discovery = page.getByTestId('discovery-tabs');
	const quick = page.getByTestId('quick-actions');

	const [profileBox, discoveryBox, quickBox] = await Promise.all([
		profile.boundingBox(),
		discovery.boundingBox(),
		quick.boundingBox()
	]);
	expect(profileBox).not.toBeNull();
	expect(discoveryBox).not.toBeNull();
	expect(quickBox).not.toBeNull();
	if (profileBox && discoveryBox) expect(profileBox.y).toBeLessThan(discoveryBox.y);
	if (discoveryBox && quickBox) expect(discoveryBox.y).toBeLessThan(quickBox.y);
});

test('desktop: two-column layout places discovery tabs to the right of profile card', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(HOME);
	if (await isUnauthenticated(page)) {
		test.skip();
		return;
	}

	const profileBox = await page.getByTestId('profile-card').boundingBox();
	const discoveryBox = await page.getByTestId('discovery-tabs').boundingBox();
	expect(profileBox).not.toBeNull();
	expect(discoveryBox).not.toBeNull();
	if (profileBox && discoveryBox) {
		expect(discoveryBox.x).toBeGreaterThan(profileBox.x + profileBox.width - 1);
	}
});
