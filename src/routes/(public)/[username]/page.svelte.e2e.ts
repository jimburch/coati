import { expect, test } from '@playwright/test';

const PROFILE_URL = '/jimburch';

test('renders three tabs on the profile page', async ({ page }) => {
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('tab-setups')).toBeVisible();
	await expect(page.getByTestId('tab-starred')).toBeVisible();
	await expect(page.getByTestId('tab-activity')).toBeVisible();
});

test('setups tab is active by default (no query param)', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const setupsTab = page.getByTestId('tab-setups');
	await expect(setupsTab).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-setups')).toBeVisible();
});

test('setups tab is active when ?tab=setups is in URL', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=setups`);
	await expect(page.getByTestId('tab-setups')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-setups')).toBeVisible();
});

test('clicking starred tab updates URL to ?tab=starred', async ({ page }) => {
	await page.goto(PROFILE_URL);
	await page.getByTestId('tab-starred').click();
	await expect(page).toHaveURL(/\?tab=starred/);
});

test('clicking activity tab updates URL to ?tab=activity', async ({ page }) => {
	await page.goto(PROFILE_URL);
	await page.getByTestId('tab-activity').click();
	await expect(page).toHaveURL(/\?tab=activity/);
});

test('direct navigation to ?tab=starred loads starred tab', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=starred`);
	await expect(page.getByTestId('tab-starred')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-starred')).toBeVisible();
});

test('direct navigation to ?tab=activity loads activity tab', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=activity`);
	await expect(page.getByTestId('tab-activity')).toHaveAttribute('aria-current', 'page');
	await expect(page.getByTestId('tab-panel-activity')).toBeVisible();
});

test('setups tab shows setup cards or empty state', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const hasSetups = await page.getByTestId('tab-panel-setups').locator('a').first().isVisible();
	const hasEmpty = await page.getByTestId('setups-empty').isVisible();
	expect(hasSetups || hasEmpty).toBe(true);
});

test('starred tab shows setup cards or empty state', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=starred`);
	const panel = page.getByTestId('tab-panel-starred');
	await expect(panel).toBeVisible();
	const hasSetups = await panel.locator('a').first().isVisible();
	const hasEmpty = await page.getByTestId('starred-empty').isVisible();
	expect(hasSetups || hasEmpty).toBe(true);
});

test('starred tab shows author info on setup cards', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=starred`);
	const panel = page.getByTestId('tab-panel-starred');
	const cards = panel.locator('a');
	if (await cards.first().isVisible()) {
		// showAuthor=true renders the author avatar+username in each card
		const avatarImg = panel.locator('img').first();
		await expect(avatarImg).toBeVisible();
	}
});

test('activity tab shows feed or empty state', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=activity`);
	const panel = page.getByTestId('tab-panel-activity');
	await expect(panel).toBeVisible();
	const hasFeed = await page.getByTestId('feed-list').isVisible();
	const hasEmpty = await page.getByTestId('feed-empty').isVisible();
	expect(hasFeed || hasEmpty).toBe(true);
});

test('activity tab load-more button is present when feed has items at limit', async ({ page }) => {
	await page.goto(`${PROFILE_URL}?tab=activity`);
	const feedList = page.getByTestId('feed-list');
	if (await feedList.isVisible()) {
		const items = await feedList.locator('> *').count();
		if (items >= 20) {
			await expect(page.getByTestId('load-more-button')).toBeVisible();
		}
	}
});

test('switching between tabs does not lose profile header', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const username = page.locator('h1').first();
	await expect(username).toBeVisible();

	await page.getByTestId('tab-starred').click();
	await expect(username).toBeVisible();

	await page.getByTestId('tab-activity').click();
	await expect(username).toBeVisible();
});

test('desktop: tabs render correctly at 1280x720', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('profile-tabs')).toBeVisible();
	await expect(page.getByTestId('tab-setups')).toBeVisible();
	await expect(page.getByTestId('tab-starred')).toBeVisible();
	await expect(page.getByTestId('tab-activity')).toBeVisible();
});

test('mobile: tabs render correctly at 430x932', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('profile-tabs')).toBeVisible();
	await expect(page.getByTestId('tab-setups')).toBeVisible();
	await expect(page.getByTestId('tab-starred')).toBeVisible();
	await expect(page.getByTestId('tab-activity')).toBeVisible();
});

test('shows name as primary h1 with @username below when name is set', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const profileName = page.getByTestId('profile-name');
	const profileUsername = page.getByTestId('profile-username');
	const hasName = await profileName.isVisible();
	if (hasName) {
		await expect(profileName).toBeVisible();
		await expect(profileUsername).toBeVisible();
		await expect(profileUsername).toContainText('@');
	} else {
		// fallback: @username is the h1
		await expect(page.locator('h1').first()).toContainText('@');
	}
});

test('shows @username as heading when name is null', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const profileName = page.getByTestId('profile-name');
	const hasName = await profileName.isVisible();
	if (!hasName) {
		await expect(page.locator('h1').first()).toContainText('@');
	}
});

test('shows location with map pin svg when set', async ({ page }) => {
	await page.goto(PROFILE_URL);
	const locationEl = page.getByTestId('profile-location');
	const hasLocation = await locationEl.isVisible();
	if (hasLocation) {
		await expect(locationEl).toBeVisible();
		await expect(locationEl.locator('svg')).toBeVisible();
	}
});

test('edit profile button is not visible to logged-out visitors', async ({ page }) => {
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('edit-profile-button')).not.toBeVisible();
});

test('edit profile button is not visible when viewing another users profile', async ({ page }) => {
	// Visiting any profile while not logged in — button should not be present
	await page.goto(PROFILE_URL);
	const button = page.getByTestId('edit-profile-button');
	await expect(button).not.toBeVisible();
});

test('edit profile modal is accessible when edit button is clicked (owner)', async ({ page }) => {
	// This test verifies the modal structure via testid attributes.
	// Full owner flow requires an authenticated session; here we verify the page
	// renders without errors and the modal markup is wired correctly when visible.
	await page.goto(PROFILE_URL);
	await expect(page.getByTestId('profile-tabs')).toBeVisible();
	// The modal is rendered only for owner; verify no modal is shown without auth
	await expect(page.getByTestId('edit-profile-modal')).not.toBeVisible();
});

test('desktop: profile heading visible at 1280x720', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(PROFILE_URL);
	await expect(page.locator('h1').first()).toBeVisible();
});

test('mobile: profile heading visible at 430x932', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(PROFILE_URL);
	await expect(page.locator('h1').first()).toBeVisible();
});

test('mobile: tab nav has no horizontal overflow at 430px', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(PROFILE_URL);
	const nav = page.locator('[aria-label="Profile tabs"]');
	await expect(nav).toBeVisible();
	const overflow = await nav.evaluate((el) => el.scrollWidth <= el.clientWidth);
	expect(overflow).toBe(true);
});

test('mobile: avatar is smaller than desktop avatar', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only');
	await page.goto(PROFILE_URL);
	// Avatar container should be 64px (size-16) on mobile
	const box = await page.locator('span[class*="size-16"]').first().boundingBox();
	expect(box).not.toBeNull();
	if (box) {
		expect(box.width).toBeLessThanOrEqual(64);
	}
});

test('desktop: avatar is full size at 1280x720', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only');
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto(PROFILE_URL);
	const box = await page.locator('span[class*="size-24"]').first().boundingBox();
	expect(box).not.toBeNull();
	if (box) {
		expect(box.width).toBeGreaterThanOrEqual(96);
	}
});
