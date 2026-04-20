import { expect, test, type Page } from '@playwright/test';

const MOCK_ITEMS = [
	{
		id: '1',
		name: 'Claude Hooks Setup',
		slug: 'claude-hooks',
		starsCount: 42,
		ownerUsername: 'alice',
		agents: ['claude-code']
	},
	{
		id: '2',
		name: 'Cursor Config',
		slug: 'cursor-config',
		starsCount: 15,
		ownerUsername: 'bob',
		agents: []
	}
];

async function mockSearchApi(page: Page, setups = MOCK_ITEMS, delayMs = 0) {
	await page.route('**/api/v1/search**', async (route) => {
		if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				data: { users: [], setups }
			})
		});
	});
}

// Dropdown-behavior tests run on desktop only; mocked fetch + keyboard/mouse
// interactions behave identically on both viewports. A separate mobile-only
// test below covers the mobile-specific expand/collapse flow.
test.describe('SearchDropdown behavior (desktop)', () => {
	test.skip(({ isMobile }) => isMobile, 'desktop-only; mobile covered separately');

	test('debounce and min-character threshold gate dropdown visibility', async ({ page }) => {
		await mockSearchApi(page);
		await page.goto('/');

		const input = page.getByRole('searchbox');
		const listbox = page.getByRole('listbox');

		await input.fill('a');
		await page.waitForTimeout(500);
		await expect(listbox).not.toBeVisible();

		await input.fill('cl');
		await expect(listbox).toBeVisible({ timeout: 2000 });

		await input.fill('c');
		await expect(listbox).not.toBeVisible();
	});

	test('result content shows name, author, stars, agent icon, and empty state', async ({
		page
	}) => {
		await mockSearchApi(page);
		await page.goto('/');

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
		await expect(page.getByText('Claude Hooks Setup')).toBeVisible();
		await expect(page.getByText('alice')).toBeVisible();
		await expect(page.getByText('42')).toBeVisible();
		await expect(page.getByRole('option').first().locator('.agent-icon')).toBeAttached();

		await mockSearchApi(page, []);
		await page.getByRole('searchbox').fill('xyzzy');
		await expect(page.getByText('No results found')).toBeVisible({ timeout: 2000 });
	});

	test('clicking a result navigates to the setup detail page', async ({ page }) => {
		await mockSearchApi(page);
		await page.goto('/');

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
		await page.getByRole('option').first().click();
		await page.waitForURL(/\/alice\/claude-hooks/);
	});

	test('"View all results" button navigates to /explore with encoded query', async ({ page }) => {
		await mockSearchApi(page);
		await page.goto('/');

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
		await page.getByRole('button', { name: /View all results/ }).click();
		await page.waitForURL(/\/explore\?q=claude/);
	});

	test('keyboard: ArrowDown/Up cycles highlight, Escape closes', async ({ page }) => {
		await mockSearchApi(page);
		await page.goto('/');

		const input = page.getByRole('searchbox');
		const options = page.getByRole('option');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('ArrowDown');
		await expect(options.first()).toHaveAttribute('aria-selected', 'true');

		await input.press('ArrowDown');
		await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');

		await input.press('ArrowUp');
		await input.press('ArrowUp');
		const count = await options.count();
		for (let i = 0; i < count; i++) {
			await expect(options.nth(i)).toHaveAttribute('aria-selected', 'false');
		}

		await input.press('Escape');
		await expect(page.getByRole('listbox')).not.toBeVisible();
		await expect(input).not.toBeFocused();
	});

	test('Enter navigates to highlighted result, or to /explore when no highlight', async ({
		page
	}) => {
		await mockSearchApi(page);
		await page.goto('/');

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
		await input.press('ArrowDown');
		await input.press('Enter');
		await page.waitForURL(/\/alice\/claude-hooks/);

		await page.goto('/');
		const input2 = page.getByRole('searchbox');
		await input2.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
		await input2.press('Enter');
		await page.waitForURL(/\/explore\?q=claude/);
	});

	test('clicking outside the search container closes the dropdown', async ({ page }) => {
		await mockSearchApi(page);
		await page.goto('/');

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
		await page.mouse.click(200, 600);
		await expect(page.getByRole('listbox')).not.toBeVisible();
	});

	test('shows loading spinner while fetching results', async ({ page }) => {
		await mockSearchApi(page, MOCK_ITEMS, 600);
		await page.goto('/');

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByLabel('Loading')).toBeVisible({ timeout: 2000 });
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 3000 });
	});

	test('search input is always visible in the navbar', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('searchbox')).toBeVisible();
	});

	test('"/" shortcut focuses search; typing "/" inside the input types literally', async ({
		page
	}) => {
		await mockSearchApi(page);
		await page.goto('/');

		await page.keyboard.press('/');
		await expect(page.getByRole('searchbox')).toBeFocused();

		const input = page.getByRole('searchbox');
		await input.fill('');
		await page.keyboard.press('/');
		await expect(input).toHaveValue('/');
	});
});

test.describe('Mobile search — expand/collapse', () => {
	test.skip(({ isMobile }) => !isMobile, 'mobile-only');

	test('Search button is rendered on mobile and "/" shortcut expands the search bar', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();

		// Keyboard shortcut path exercises the mobile expand flow end-to-end
		await page.keyboard.press('/');
		await expect(page.getByRole('searchbox')).toBeVisible({ timeout: 1000 });
	});
});
