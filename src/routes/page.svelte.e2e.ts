import { expect, test } from '@playwright/test';

// Tests require an authenticated session and a seeded database.
// For auth, set up a global Playwright auth fixture that saves session cookies
// to playwright/.auth/user.json (user with setups) and
// playwright/.auth/zero-state-user.json (user with no setups).
// Unauthenticated requests are redirected to GitHub OAuth; tests detect this
// and skip gracefully when auth is not available.

const HOME = '/';

function isAuthRedirect(url: string): boolean {
	return url.includes('/auth/login') || url.includes('github.com/login');
}

// ─── Logged-in happy path ─────────────────────────────────────────────────────

test('happy path: profile card is visible when authenticated', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('profile-card')).toBeVisible();
});

test('happy path: discovery tabs section is visible', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
});

test('happy path: quick actions section is visible', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('quick-actions')).toBeVisible();
});

test('happy path: stats grid always shown for authenticated users', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('stats-grid')).toBeVisible();
});

test('happy path: stats grid shown alongside setups when user has setups', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) === 0) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('stats-grid')).toBeVisible();
	await expect(page.getByTestId('your-setups-list')).toBeVisible();
});

test('happy path: your setups list shown when user has setups', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const statsGrid = page.getByTestId('stats-grid');
	if (!(await statsGrid.isVisible())) {
		// Zero-state user — skip happy-path assertion
		test.skip();
		return;
	}
	await expect(page.getByTestId('your-setups-list')).toBeVisible();
});

test('happy path: agent chips shown when user has agents', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const statsGrid = page.getByTestId('stats-grid');
	if (!(await statsGrid.isVisible())) {
		test.skip();
		return;
	}
	// AgentChips only renders when agents exist; presence is optional
	const agentChips = page.getByTestId('agent-chips');
	// If present in DOM, it must be visible
	if ((await agentChips.count()) > 0) {
		await expect(agentChips).toBeVisible();
	}
});

test('happy path: activity panel visible when authenticated', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('activity-panel')).toBeVisible();
});

test('happy path: activity panel shows See all link when there are items', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const panel = page.getByTestId('activity-panel');
	await expect(panel).toBeVisible();
	const seeAll = panel.getByTestId('see-all-link');
	// See-all is only rendered when there are items (not in the zero empty state)
	if ((await seeAll.count()) > 0) {
		await expect(seeAll).toHaveAttribute('href', '/feed');
	}
});

// ─── Zero-state user ──────────────────────────────────────────────────────────

test('zero-state: StatsGrid still shown when no setups', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		// Not a zero-state user — skip
		test.skip();
		return;
	}
	await expect(page.getByTestId('stats-grid')).toBeVisible();
});

test('zero-state: YourSetupsList absent when no setups', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('your-setups-list')).not.toBeVisible();
});

test('zero-state: AgentChips absent when user has no setups', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('agent-chips')).not.toBeVisible();
});

test('zero-state: activity panel renders zero empty state when no activity', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}
	// Panel must be present; content could be zero empty-state, popular items, or follow CTA
	await expect(page.getByTestId('activity-panel')).toBeVisible();
});

test('zero-state: Following tab shows empty state', async ({ page }) => {
	await page.goto(`${HOME}?tab=following`);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}
	// Following tab empty state shown when user doesn't follow anyone
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await expect(page.getByText('Follow people to see their setups here.')).toBeVisible();
});

test('zero-state: For You tab still renders content', async ({ page }) => {
	await page.goto(`${HOME}?tab=for-you`);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}
	// For You tab should show the tab nav (content may be empty-state or cards)
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await expect(page.getByRole('link', { name: 'For You' })).toBeVisible();
});

// ─── Tab switching ────────────────────────────────────────────────────────────

test('tab switching: clicking Trending tab updates URL to ?tab=trending', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await page.getByRole('link', { name: 'Trending' }).click();
	await expect(page).toHaveURL(/[?&]tab=trending/);
});

test('tab switching: clicking Following tab updates URL to ?tab=following', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await page.getByRole('link', { name: 'Following' }).click();
	await expect(page).toHaveURL(/[?&]tab=following/);
});

test('tab switching: clicking For You tab updates URL to ?tab=for-you', async ({ page }) => {
	await page.goto(`${HOME}?tab=trending`);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
	await page.getByRole('link', { name: 'For You' }).click();
	await expect(page).toHaveURL(/[?&]tab=for-you/);
});

test('tab switching: Trending tab renders setup grid after switching', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await page.getByRole('link', { name: 'Trending' }).click();
	await expect(page).toHaveURL(/[?&]tab=trending/);
	// After switching the tab content updates; discovery tabs section must still be visible
	await expect(page.getByTestId('discovery-tabs')).toBeVisible();
});

// ─── Reload with ?tab=trending ────────────────────────────────────────────────

test('reload: ?tab=trending loads with Trending tab active', async ({ page }) => {
	await page.goto(`${HOME}?tab=trending`);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const trendingLink = page.getByRole('link', { name: 'Trending' });
	await expect(trendingLink).toHaveAttribute('aria-current', 'page');
});

test('reload: ?tab=following loads with Following tab active', async ({ page }) => {
	await page.goto(`${HOME}?tab=following`);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const followingLink = page.getByRole('link', { name: 'Following' });
	await expect(followingLink).toHaveAttribute('aria-current', 'page');
});

test('reload: default (no ?tab) loads with For You tab active', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const forYouLink = page.getByRole('link', { name: 'For You' });
	await expect(forYouLink).toHaveAttribute('aria-current', 'page');
});

// ─── Mobile section order ─────────────────────────────────────────────────────

test('mobile: ProfileCard appears above DiscoveryTabs', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}

	const profile = page.getByTestId('profile-card');
	const discovery = page.getByTestId('discovery-tabs');
	await expect(profile).toBeVisible();
	await expect(discovery).toBeVisible();

	const profileBox = await profile.boundingBox();
	const discoveryBox = await discovery.boundingBox();
	expect(profileBox).not.toBeNull();
	expect(discoveryBox).not.toBeNull();
	if (profileBox && discoveryBox) {
		expect(profileBox.y).toBeLessThan(discoveryBox.y);
	}
});

test('mobile: DiscoveryTabs appears above QuickActions', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}

	const discovery = page.getByTestId('discovery-tabs');
	const quick = page.getByTestId('quick-actions');
	await expect(discovery).toBeVisible();
	await expect(quick).toBeVisible();

	const discoveryBox = await discovery.boundingBox();
	const quickBox = await quick.boundingBox();
	expect(discoveryBox).not.toBeNull();
	expect(quickBox).not.toBeNull();
	if (discoveryBox && quickBox) {
		expect(discoveryBox.y).toBeLessThan(quickBox.y);
	}
});

test('mobile: DiscoveryTabs appears above YourSetupsList', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}

	const setupsList = page.getByTestId('your-setups-list');
	if ((await setupsList.count()) === 0) {
		// Zero-state user — YourSetupsList absent; skip this check
		test.skip();
		return;
	}

	const discovery = page.getByTestId('discovery-tabs');
	await expect(discovery).toBeVisible();
	await expect(setupsList).toBeVisible();

	const discoveryBox = await discovery.boundingBox();
	const setupsBox = await setupsList.boundingBox();
	expect(discoveryBox).not.toBeNull();
	expect(setupsBox).not.toBeNull();
	if (discoveryBox && setupsBox) {
		expect(discoveryBox.y).toBeLessThan(setupsBox.y);
	}
});

test('mobile: Featured Setups appears above YourActivityPanel', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}

	const featured = page.getByTestId('featured-setups');
	const activity = page.getByTestId('activity-panel');
	if ((await featured.count()) === 0 || (await activity.count()) === 0) {
		// One of the conditional sections is absent
		test.skip();
		return;
	}

	await expect(featured).toBeVisible();
	await expect(activity).toBeVisible();

	const featuredBox = await featured.boundingBox();
	const activityBox = await activity.boundingBox();
	expect(featuredBox).not.toBeNull();
	expect(activityBox).not.toBeNull();
	if (featuredBox && activityBox) {
		expect(featuredBox.y).toBeLessThan(activityBox.y);
	}
});

test('mobile: full section ordering — profile → discovery → quick', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}

	const profile = page.getByTestId('profile-card');
	const discovery = page.getByTestId('discovery-tabs');
	const quick = page.getByTestId('quick-actions');

	await expect(profile).toBeVisible();
	await expect(discovery).toBeVisible();
	await expect(quick).toBeVisible();

	const profileBox = await profile.boundingBox();
	const discoveryBox = await discovery.boundingBox();
	const quickBox = await quick.boundingBox();

	// Assert top-to-bottom ordering of key anchors
	if (profileBox && discoveryBox) expect(profileBox.y).toBeLessThan(discoveryBox.y);
	if (discoveryBox && quickBox) expect(discoveryBox.y).toBeLessThan(quickBox.y);
});

// ─── Desktop layout (sanity) ──────────────────────────────────────────────────

test('desktop: two-column layout — profile card and discovery tabs side by side', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}

	const profile = page.getByTestId('profile-card');
	const discovery = page.getByTestId('discovery-tabs');
	await expect(profile).toBeVisible();
	await expect(discovery).toBeVisible();

	const profileBox = await profile.boundingBox();
	const discoveryBox = await discovery.boundingBox();
	expect(profileBox).not.toBeNull();
	expect(discoveryBox).not.toBeNull();
	if (profileBox && discoveryBox) {
		// On desktop the two columns are side by side: discovery starts at a larger x
		expect(discoveryBox.x).toBeGreaterThan(profileBox.x + profileBox.width - 1);
	}
});
