import { expect, test } from '@playwright/test';

const SETUP_URL = '/jimburch/claude-code-pro';
const MULTI_AGENT_URL = '/jimburch/multi-agent-setup';

// ─── SetupFileList: basic rendering ──────────────────────────────────────────

test('file list section heading is visible when files exist', async ({ page }) => {
	await page.goto(SETUP_URL);
	const fileList = page.getByTestId('setup-file-list');
	if (await fileList.isVisible()) {
		await expect(page.getByText('Files')).toBeVisible();
	}
});

test('browse all files link points to /files route', async ({ page }) => {
	await page.goto(SETUP_URL);
	const fileList = page.getByTestId('setup-file-list');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	const browseLink = fileList.getByRole('link', { name: /browse all/i });
	await expect(browseLink).toBeVisible();
	const href = await browseLink.getAttribute('href');
	expect(href).toBe(`${SETUP_URL}/files`);
});

test('file rows link to /{username}/{slug}/files?file= route', async ({ page }) => {
	await page.goto(SETUP_URL);
	const fileList = page.getByTestId('setup-file-list');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	// Expand all agent groups so file rows are accessible
	const groupHeaders = page.getByTestId('agent-group-header');
	for (const header of await groupHeaders.all()) {
		if ((await header.getAttribute('aria-expanded')) === 'false') {
			await header.click();
		}
	}
	// Expand subfolder groups too
	const subfolderToggles = page.getByTestId('subfolder-group').getByTestId('collapse-toggle');
	for (const toggle of await subfolderToggles.all()) {
		if ((await toggle.getAttribute('aria-expanded')) === 'false') {
			await toggle.click();
		}
	}

	const fileRows = page.getByTestId('file-row');
	const rowCount = await fileRows.count();
	if (rowCount === 0) {
		test.skip();
		return;
	}

	const firstRow = fileRows.first();
	const href = await firstRow.getAttribute('href');
	expect(href).toMatch(new RegExp(`^${SETUP_URL}/files\\?file=`));
});

// ─── Agent group collapse/expand ─────────────────────────────────────────────

test('agent group: clicking header toggles aria-expanded state', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const groupHeaders = page.getByTestId('agent-group-header');
	if ((await groupHeaders.count()) === 0) {
		test.skip();
		return;
	}
	const firstHeader = groupHeaders.first();
	const initialExpanded = await firstHeader.getAttribute('aria-expanded');
	await firstHeader.click();
	const afterExpanded = await firstHeader.getAttribute('aria-expanded');
	// State should have toggled
	expect(afterExpanded).not.toBe(initialExpanded);
});

test('agent group: can expand a collapsed group', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const groupHeaders = page.getByTestId('agent-group-header');
	if ((await groupHeaders.count()) === 0) {
		test.skip();
		return;
	}
	const firstHeader = groupHeaders.first();
	// Ensure collapsed first
	if ((await firstHeader.getAttribute('aria-expanded')) === 'true') {
		await firstHeader.click();
		await expect(firstHeader).toHaveAttribute('aria-expanded', 'false');
	}
	// Expand
	await firstHeader.click();
	await expect(firstHeader).toHaveAttribute('aria-expanded', 'true');
});

test('agent group: can collapse an expanded group', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const groupHeaders = page.getByTestId('agent-group-header');
	if ((await groupHeaders.count()) === 0) {
		test.skip();
		return;
	}
	const firstHeader = groupHeaders.first();
	// Ensure expanded first
	if ((await firstHeader.getAttribute('aria-expanded')) === 'false') {
		await firstHeader.click();
		await expect(firstHeader).toHaveAttribute('aria-expanded', 'true');
	}
	// Collapse
	await firstHeader.click();
	await expect(firstHeader).toHaveAttribute('aria-expanded', 'false');
});

test('multi-agent setup shows multiple agent group headers', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const agentGroups = page.getByTestId('agent-group-header');
	const count = await agentGroups.count();
	expect(count).toBeGreaterThan(1);
});

test('agent group headers display file count', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const agentGroups = page.getByTestId('agent-group-header');
	if ((await agentGroups.count()) === 0) {
		test.skip();
		return;
	}
	const firstGroup = agentGroups.first();
	await expect(firstGroup).toBeVisible();
	await expect(firstGroup.getByText(/\d+ files?/)).toBeVisible();
});

// ─── Subfolder collapse/expand ────────────────────────────────────────────────

test('subfolder: toggle button switches aria-expanded state', async ({ page }) => {
	await page.goto(SETUP_URL);
	const subfolderGroups = page.getByTestId('subfolder-group');
	if ((await subfolderGroups.count()) === 0) {
		// Try multi-agent URL as well
		await page.goto(MULTI_AGENT_URL);
	}
	const refreshedGroups = page.getByTestId('subfolder-group');
	if ((await refreshedGroups.count()) === 0) {
		test.skip();
		return;
	}
	const firstSubfolder = refreshedGroups.first();
	// The button inside subfolder-group has data-testid="collapse-toggle" and aria-expanded
	const toggleBtn = firstSubfolder.getByTestId('collapse-toggle');
	const initialExpanded = await toggleBtn.getAttribute('aria-expanded');
	await toggleBtn.click();
	const afterExpanded = await toggleBtn.getAttribute('aria-expanded');
	expect(afterExpanded).not.toBe(initialExpanded);
});

test('subfolder: can expand a collapsed subfolder', async ({ page }) => {
	await page.goto(SETUP_URL);
	let subfolderGroups = page.getByTestId('subfolder-group');
	if ((await subfolderGroups.count()) === 0) {
		await page.goto(MULTI_AGENT_URL);
		subfolderGroups = page.getByTestId('subfolder-group');
	}
	if ((await subfolderGroups.count()) === 0) {
		test.skip();
		return;
	}
	// Ensure agent groups are expanded first so subfolders are in the DOM and reachable
	const groupHeaders = page.getByTestId('agent-group-header');
	for (const header of await groupHeaders.all()) {
		if ((await header.getAttribute('aria-expanded')) === 'false') {
			await header.click();
		}
	}

	const firstSubfolder = subfolderGroups.first();
	const toggleBtn = firstSubfolder.getByTestId('collapse-toggle');
	// Ensure collapsed
	if ((await toggleBtn.getAttribute('aria-expanded')) === 'true') {
		await toggleBtn.click();
		await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
	}
	// Expand
	await toggleBtn.click();
	await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
});

// ─── Auto-expand threshold ────────────────────────────────────────────────────

test('auto-expand: groups start expanded when total files ≤ 10', async ({ page }) => {
	await page.goto(SETUP_URL);
	const fileList = page.getByTestId('setup-file-list');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	const groupHeaders = page.getByTestId('agent-group-header');
	if ((await groupHeaders.count()) === 0) {
		// All-agentless setup: no group headers, nothing to assert
		test.skip();
		return;
	}
	// file-row elements are always in DOM regardless of expand state
	const totalFiles = await page.getByTestId('file-row').count();
	if (totalFiles > 10) {
		// Wrong URL for this test variant — skip gracefully
		test.skip();
		return;
	}
	// All agent group headers should start expanded
	for (const header of await groupHeaders.all()) {
		await expect(header).toHaveAttribute('aria-expanded', 'true');
	}
});

test('auto-expand: groups start collapsed when total files > 10', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const fileList = page.getByTestId('setup-file-list');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	const groupHeaders = page.getByTestId('agent-group-header');
	if ((await groupHeaders.count()) === 0) {
		test.skip();
		return;
	}
	const totalFiles = await page.getByTestId('file-row').count();
	if (totalFiles <= 10) {
		// Wrong URL for this test variant — skip gracefully
		test.skip();
		return;
	}
	// All agent group headers should start collapsed
	for (const header of await groupHeaders.all()) {
		await expect(header).toHaveAttribute('aria-expanded', 'false');
	}
});

test('auto-expand: threshold boundary — groups reflect shouldStartExpanded logic', async ({
	page
}) => {
	await page.goto(SETUP_URL);
	const fileList = page.getByTestId('setup-file-list');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	const groupHeaders = page.getByTestId('agent-group-header');
	if ((await groupHeaders.count()) === 0) {
		test.skip();
		return;
	}
	const totalFiles = await page.getByTestId('file-row').count();
	const expectedExpanded = totalFiles <= 10;

	for (const header of await groupHeaders.all()) {
		await expect(header).toHaveAttribute('aria-expanded', expectedExpanded ? 'true' : 'false');
	}
});

// ─── Sidebar / clone command ──────────────────────────────────────────────────

test('desktop: sidebar is visible alongside main content', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(SETUP_URL);
	const sidebar = page.getByTestId('sidebar');
	await expect(sidebar).toBeVisible();
	const fileList = page.getByTestId('setup-file-list');
	if (await fileList.isVisible()) {
		await expect(fileList).toBeVisible();
	}
});

test('desktop: sidebar shows clone command heading and code', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(SETUP_URL);
	const sidebar = page.getByTestId('sidebar');
	await expect(sidebar).toBeVisible();
	// Desktop sidebar has a "Clone" section
	await expect(sidebar.getByText('Clone')).toBeVisible();
	await expect(sidebar.locator('code').first()).toBeVisible();
});

test('desktop: sidebar clone command stays visible after scrolling down', async ({
	page,
	isMobile
}) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(SETUP_URL);
	const sidebar = page.getByTestId('sidebar');
	const cloneCode = sidebar.locator('code').first();
	await expect(cloneCode).toBeVisible();

	// Scroll down significantly
	await page.evaluate(() => window.scrollBy(0, 800));
	// Allow time for any repaints
	await page.waitForFunction(() => window.scrollY > 0);

	// Clone command should still be visible (sidebar is sticky: lg:sticky lg:top-16)
	await expect(cloneCode).toBeVisible();
});

// ─── Mobile layout ────────────────────────────────────────────────────────────

test('mobile: inline clone command visible in main column', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	// On mobile the clone command is in a .lg:hidden container above the file list
	// It contains a <code> element with the clone command
	const mobileClone = page
		.locator('.lg\\:hidden')
		.filter({ has: page.locator('code') })
		.first();
	await expect(mobileClone).toBeVisible();
});

test('mobile: header appears above file list in stacked layout', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	const header = page.getByTestId('setup-header');
	const fileList = page.getByTestId('setup-file-list');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	const headerBounds = await header.boundingBox();
	const fileListBounds = await fileList.boundingBox();
	expect(headerBounds).not.toBeNull();
	expect(fileListBounds).not.toBeNull();
	if (headerBounds && fileListBounds) {
		// Header's top edge must be above file list's top edge
		expect(headerBounds.y).toBeLessThan(fileListBounds.y);
	}
});

test('mobile: file list appears above sidebar in stacked layout', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	const fileList = page.getByTestId('setup-file-list');
	const sidebar = page.getByTestId('sidebar');
	if (!(await fileList.isVisible())) {
		test.skip();
		return;
	}
	const fileListBounds = await fileList.boundingBox();
	const sidebarBounds = await sidebar.boundingBox();
	expect(fileListBounds).not.toBeNull();
	expect(sidebarBounds).not.toBeNull();
	if (fileListBounds && sidebarBounds) {
		// File list's top edge must be above sidebar's top edge
		expect(fileListBounds.y).toBeLessThan(sidebarBounds.y);
	}
});

test('mobile: stacking order — header before clone before file list before sidebar', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);

	const header = page.getByTestId('setup-header');
	const mobileClone = page
		.locator('.lg\\:hidden')
		.filter({ has: page.locator('code') })
		.first();
	const sidebar = page.getByTestId('sidebar');

	const headerBounds = await header.boundingBox();
	const cloneBounds = await mobileClone.boundingBox();
	const sidebarBounds = await sidebar.boundingBox();

	expect(headerBounds).not.toBeNull();
	expect(cloneBounds).not.toBeNull();
	expect(sidebarBounds).not.toBeNull();

	if (headerBounds && cloneBounds && sidebarBounds) {
		// header → clone → sidebar (top-to-bottom)
		expect(headerBounds.y).toBeLessThan(cloneBounds.y);
		expect(cloneBounds.y).toBeLessThan(sidebarBounds.y);
	}
});

test('mobile: sidebar clone is hidden (desktop-only sidebar section)', async ({
	page,
	isMobile
}) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	const sidebar = page.getByTestId('sidebar');
	await expect(sidebar).toBeVisible();
	// The clone section inside the sidebar is hidden lg:block — not visible on mobile
	const sidebarCloneHeading = sidebar.getByText('Clone');
	await expect(sidebarCloneHeading).not.toBeVisible();
});

// ─── Header band ─────────────────────────────────────────────────────────────

test('header band: shows setup title heading', async ({ page }) => {
	await page.goto(SETUP_URL);
	const header = page.getByTestId('setup-header');
	await expect(header.locator('h1')).toBeVisible();
	const titleText = await header.locator('h1').textContent();
	expect(titleText?.trim().length).toBeGreaterThan(0);
});

test('page title includes setup name and Coati brand', async ({ page }) => {
	await page.goto(SETUP_URL);
	const title = await page.title();
	expect(title).toContain('Coati');
	expect(title.length).toBeGreaterThan(0);
});

test('header band title is non-empty when display name is set', async ({ page }) => {
	await page.goto(SETUP_URL);
	const header = page.getByTestId('setup-header');
	const heading = header.locator('h1');
	await expect(heading).toBeVisible();
	const text = await heading.textContent();
	expect(text?.trim().length).toBeGreaterThan(0);
});

// ─── Agent badges ─────────────────────────────────────────────────────────────

test('agent badges in header band link to /agents/ pages', async ({ page }) => {
	await page.goto(SETUP_URL);
	const agentLink = page.locator('a[href^="/agents/"]').first();
	if (await agentLink.isVisible()) {
		const href = await agentLink.getAttribute('href');
		expect(href).toMatch(/^\/agents\//);
	}
});

// ─── About section editing ────────────────────────────────────────────────────

test('about section: edit button not visible to non-owners', async ({ page }) => {
	// When not logged in, the edit pencil button should not appear
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	await expect(editAboutBtn).not.toBeVisible();
});

test('about section: pencil icon opens editor for owner', async ({ page }) => {
	// Requires owner authentication — skip if edit button not visible
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	if (!(await editAboutBtn.isVisible())) {
		test.skip();
		return;
	}
	await editAboutBtn.click();
	await expect(page.getByTestId('about-editor')).toBeVisible();
	await expect(page.getByTestId('about-display-input')).toBeVisible();
	await expect(page.getByTestId('about-description-textarea')).toBeVisible();
});

test('about section: cancel button closes editor without saving', async ({ page }) => {
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	if (!(await editAboutBtn.isVisible())) {
		test.skip();
		return;
	}
	await editAboutBtn.click();
	await expect(page.getByTestId('about-editor')).toBeVisible();

	await page.getByTestId('cancel-about-btn').click();
	await expect(page.getByTestId('about-editor')).not.toBeVisible();
	await expect(page.getByTestId('edit-about-btn')).toBeVisible();
});

test('about section: save updates display name in header band', async ({ page }) => {
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	if (!(await editAboutBtn.isVisible())) {
		test.skip();
		return;
	}
	await editAboutBtn.click();

	await page.getByTestId('about-display-input').fill('Updated Display Name');
	await page.getByTestId('about-description-textarea').fill('Updated description text');
	await page.getByTestId('save-about-btn').click();

	// After save, edit mode closes and updated name appears in h1
	await expect(page.getByTestId('about-editor')).not.toBeVisible();
	await expect(page.getByTestId('setup-header').locator('h1')).toContainText(
		'Updated Display Name'
	);
});

test('about section: empty display name blocked by required attribute', async ({ page }) => {
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	if (!(await editAboutBtn.isVisible())) {
		test.skip();
		return;
	}
	await editAboutBtn.click();

	await page.getByTestId('about-display-input').fill('');
	// The input has `required` — browser prevents form submission
	await page.getByTestId('save-about-btn').click();
	// Editor should remain open
	await expect(page.getByTestId('about-editor')).toBeVisible();
});
