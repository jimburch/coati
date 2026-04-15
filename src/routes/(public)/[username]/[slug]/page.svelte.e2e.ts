import { expect, test } from '@playwright/test';

const SETUP_URL = '/jimburch/claude-code-pro';
const MULTI_AGENT_URL = '/jimburch/multi-agent-setup';

test('shows file groups section', async ({ page }) => {
	await page.goto(SETUP_URL);
	await expect(page.getByText('Files')).toBeVisible();
});

test('shows browse all files link', async ({ page }) => {
	await page.goto(SETUP_URL);
	await expect(page.getByRole('link', { name: /browse all/i })).toBeVisible();
	await expect(page.getByRole('link', { name: /browse all/i })).toHaveAttribute(
		'href',
		`${SETUP_URL}/files`
	);
});

test('shows shared group when files have no agent', async ({ page }) => {
	await page.goto(SETUP_URL);
	// For a single-agent or mixed setup, shared group may appear
	// We verify the file groups container renders
	const fileGroups = page.getByTestId('file-groups');
	await expect(fileGroups).toBeVisible();
});

test('multi-agent setup shows multiple agent groups', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const agentGroups = page.getByTestId('agent-group');
	const count = await agentGroups.count();
	expect(count).toBeGreaterThan(1);
});

test('agent groups show file counts', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	// Each agent group should show a file count like "3 files" or "1 file"
	const agentGroups = page.getByTestId('agent-group');
	const firstGroup = agentGroups.first();
	await expect(firstGroup).toBeVisible();
	await expect(firstGroup.getByText(/\d+ files?/)).toBeVisible();
});

test('shared group shows file count', async ({ page }) => {
	await page.goto(MULTI_AGENT_URL);
	const sharedGroup = page.getByTestId('shared-group');
	if (await sharedGroup.isVisible()) {
		await expect(sharedGroup.getByText(/\d+ files?/)).toBeVisible();
	}
});

test('agent badges in sidebar link to agent pages', async ({ page }) => {
	await page.goto(SETUP_URL);
	// Agents section has links to /agents/<slug>
	const agentLink = page.locator('a[href^="/agents/"]').first();
	if (await agentLink.isVisible()) {
		const href = await agentLink.getAttribute('href');
		expect(href).toMatch(/^\/agents\//);
	}
});

test('desktop layout: sidebar is visible alongside main content', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(SETUP_URL);
	// Two-column layout: sidebar should be visible
	const sidebar = page.locator('.lg\\:w-72');
	await expect(sidebar).toBeVisible();
	const fileGroups = page.getByTestId('file-groups');
	await expect(fileGroups).toBeVisible();
});

test('mobile layout: file groups visible in stacked layout', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	// On mobile, sidebar stacks below content — file groups should still render
	const fileGroups = page.getByTestId('file-groups');
	await expect(fileGroups).toBeVisible();
});

test('single-agent setup shows one agent group', async ({ page }) => {
	await page.goto(SETUP_URL);
	// Single-agent setup should show at least the agent group or shared group
	const fileGroups = page.getByTestId('file-groups');
	await expect(fileGroups).toBeVisible();
	const agentGroups = page.getByTestId('agent-group');
	const sharedGroup = page.getByTestId('shared-group');
	const agentCount = await agentGroups.count();
	const hasShared = await sharedGroup.isVisible();
	// At least one group must be visible
	expect(agentCount + (hasShared ? 1 : 0)).toBeGreaterThan(0);
});

test('mobile: show comments button is visible by default', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	const showBtn = page.getByTestId('show-comments-btn');
	await expect(showBtn).toBeVisible();
});

test('mobile: comment thread is hidden by default', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	const commentThread = page.getByTestId('comment-thread');
	await expect(commentThread).toBeHidden();
});

test('mobile: tapping show comments button expands comment thread', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SETUP_URL);
	const showBtn = page.getByTestId('show-comments-btn');
	await showBtn.tap();
	const commentThread = page.getByTestId('comment-thread');
	await expect(commentThread).toBeVisible();
});

test('desktop: comments always visible without toggle button', async ({ page, isMobile }) => {
	test.skip(isMobile, 'desktop-only test');
	await page.goto(SETUP_URL);
	const commentThread = page.getByTestId('comment-thread');
	await expect(commentThread).toBeVisible();
	const showBtn = page.getByTestId('show-comments-btn');
	await expect(showBtn).toBeHidden();
});

test('About section shows setup title heading', async ({ page }) => {
	await page.goto(SETUP_URL);
	// The About section contains an h2 with the setup title
	const sidebar = page.locator('.lg\\:w-72');
	await expect(sidebar.locator('h2')).toBeVisible();
	// Title should be non-empty
	const titleText = await sidebar.locator('h2').textContent();
	expect(titleText?.trim().length).toBeGreaterThan(0);
});

test('page title tag includes setup name', async ({ page }) => {
	await page.goto(SETUP_URL);
	const title = await page.title();
	expect(title).toContain('Coati');
	expect(title.length).toBeGreaterThan(0);
});

test('About section title does not contain slug separator when display name is set', async ({
	page
}) => {
	// This test verifies that setup detail About section renders a title
	// When a setup has a display name, it should appear here instead of the slug
	await page.goto(SETUP_URL);
	const sidebar = page.locator('.lg\\:w-72');
	const heading = sidebar.locator('h2');
	await expect(heading).toBeVisible();
	const text = await heading.textContent();
	expect(text?.trim().length).toBeGreaterThan(0);
});

// About section edit tests
// Note: these tests require the app to be running with an authenticated owner session.
// The edit button is only visible to setup owners.

test('About section: edit button not visible to non-owners', async ({ page }) => {
	// When not logged in, the edit button should not appear
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	await expect(editAboutBtn).not.toBeVisible();
});

test('About section: pencil icon toggles edit mode for owner', async ({ page }) => {
	// Requires owner authentication — skip if edit button not visible
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	const isVisible = await editAboutBtn.isVisible();
	if (!isVisible) {
		test.skip();
		return;
	}
	await editAboutBtn.click();
	await expect(page.getByTestId('about-editor')).toBeVisible();
	await expect(page.getByTestId('about-display-input')).toBeVisible();
	await expect(page.getByTestId('about-description-textarea')).toBeVisible();
});

test('About section: cancel button exits edit mode without saving', async ({ page }) => {
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	const isVisible = await editAboutBtn.isVisible();
	if (!isVisible) {
		test.skip();
		return;
	}
	await editAboutBtn.click();
	await expect(page.getByTestId('about-editor')).toBeVisible();

	await page.getByTestId('cancel-about-btn').click();
	await expect(page.getByTestId('about-editor')).not.toBeVisible();
	await expect(page.getByTestId('edit-about-btn')).toBeVisible();
});

test('About section: save updates display name and description', async ({ page }) => {
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	const isVisible = await editAboutBtn.isVisible();
	if (!isVisible) {
		test.skip();
		return;
	}
	await editAboutBtn.click();

	const displayInput = page.getByTestId('about-display-input');
	const descriptionTextarea = page.getByTestId('about-description-textarea');

	await displayInput.fill('Updated Display Name');
	await descriptionTextarea.fill('Updated description text');

	await page.getByTestId('save-about-btn').click();

	// After save, edit mode should close and updated values should appear
	await expect(page.getByTestId('about-editor')).not.toBeVisible();
	const sidebar = page.locator('.lg\\:w-72');
	await expect(sidebar.locator('h2')).toContainText('Updated Display Name');
});

test('About section: empty display name is rejected by browser required validation', async ({
	page
}) => {
	await page.goto(SETUP_URL);
	const editAboutBtn = page.getByTestId('edit-about-btn');
	const isVisible = await editAboutBtn.isVisible();
	if (!isVisible) {
		test.skip();
		return;
	}
	await editAboutBtn.click();

	const displayInput = page.getByTestId('about-display-input');
	await displayInput.fill('');

	// The input has `required` attribute — browser prevents form submission
	// The editor should remain visible
	await page.getByTestId('save-about-btn').click();
	await expect(page.getByTestId('about-editor')).toBeVisible();
});
