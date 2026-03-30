import { expect, test, type Page } from '@playwright/test';

const MOCK_ITEMS = [
	{
		id: '1',
		name: 'Claude Hooks Setup',
		slug: 'claude-hooks',
		starsCount: 42,
		ownerUsername: 'alice',
		agents: ['claude']
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

async function mockSearchApi(page: Page, items = MOCK_ITEMS, delayMs = 0) {
	await page.route('**/api/v1/setups**', async (route) => {
		if (delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				data: { items, total: items.length, page: 1, totalPages: 1 }
			})
		});
	});
}

// On mobile the search bar is hidden behind a button; this opens it.
// On desktop the search input is always visible so this is a no-op.
async function openSearchIfMobile(page: Page, isMobile: boolean) {
	if (isMobile) {
		await page.getByRole('button', { name: 'Search' }).click();
	}
}

test.describe('SearchDropdown — debounce and minimum character threshold', () => {
	test('single character does not open the dropdown', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('a');
		// Wait well beyond the 300 ms debounce; dropdown must stay hidden
		await page.waitForTimeout(500);

		await expect(page.getByRole('listbox')).not.toBeVisible();
	});

	test('two or more characters opens the dropdown after debounce', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('cl');

		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
	});

	test('clearing to fewer than 2 characters closes the dropdown', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('cl');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.fill('c');
		await expect(page.getByRole('listbox')).not.toBeVisible();
	});
});

test.describe('SearchDropdown — result content', () => {
	test('shows setup name, author username, and star count', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await expect(page.getByText('Claude Hooks Setup')).toBeVisible();
		await expect(page.getByText('alice')).toBeVisible();
		await expect(page.getByText('42')).toBeVisible();
	});

	test('shows agent icon for setups that have agents', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		// First result has agents: ['claude'], so an .agent-icon span should be present
		const firstOption = page.getByRole('option').first();
		await expect(firstOption.locator('.agent-icon')).toBeAttached();
	});

	test('shows no results message when API returns empty list', async ({ page, isMobile }) => {
		await mockSearchApi(page, []);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('xyzzy');
		await expect(page.getByText('No results found')).toBeVisible({ timeout: 2000 });
	});
});

test.describe('SearchDropdown — click navigation', () => {
	test('clicking a result navigates to the setup detail page', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await page.getByRole('option').first().click();
		await page.waitForURL(/\/alice\/claude-hooks/);
	});

	test('"View all results" link navigates to /explore with encoded query', async ({
		page,
		isMobile
	}) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await page.getByRole('button', { name: /View all results/ }).click();
		await page.waitForURL(/\/explore\?q=claude/);
	});
});

test.describe('SearchDropdown — keyboard navigation', () => {
	test('ArrowDown highlights the first result', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('ArrowDown');

		await expect(page.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
	});

	test('ArrowDown then ArrowUp removes the highlight', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('ArrowDown');
		await input.press('ArrowUp');

		// After going back up past first item, no option should be selected
		const options = page.getByRole('option');
		const count = await options.count();
		for (let i = 0; i < count; i++) {
			await expect(options.nth(i)).toHaveAttribute('aria-selected', 'false');
		}
	});

	test('ArrowDown cycles through multiple results', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('ArrowDown');
		await input.press('ArrowDown');

		await expect(page.getByRole('option').nth(1)).toHaveAttribute('aria-selected', 'true');
	});

	test('Enter with highlighted result navigates to that setup', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('ArrowDown');
		await input.press('Enter');

		await page.waitForURL(/\/alice\/claude-hooks/);
	});

	test('Enter without highlight navigates to /explore with query', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('Enter');

		await page.waitForURL(/\/explore\?q=claude/);
	});

	test('Escape closes the dropdown and removes focus from input', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		const input = page.getByRole('searchbox');
		await input.fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		await input.press('Escape');

		await expect(page.getByRole('listbox')).not.toBeVisible();
		await expect(input).not.toBeFocused();
	});
});

test.describe('SearchDropdown — click-outside dismissal', () => {
	test('clicking outside the search container closes the dropdown', async ({ page, isMobile }) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('claude');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });

		// Click on the page body, well away from the navbar
		await page.mouse.click(200, 600);

		await expect(page.getByRole('listbox')).not.toBeVisible();
	});
});

test.describe('SearchDropdown — loading state', () => {
	test('shows loading spinner while fetching results', async ({ page, isMobile }) => {
		// Delay API response so the loading state is visible long enough to assert
		await mockSearchApi(page, MOCK_ITEMS, 600);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		await page.getByRole('searchbox').fill('claude');

		// Spinner should appear while waiting for the delayed response
		await expect(page.getByLabel('Loading')).toBeVisible({ timeout: 2000 });

		// Eventually results arrive
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 3000 });
	});
});

test.describe('Mobile search — expand/collapse', () => {
	test('search icon button is visible on mobile', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'mobile-only');

		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
	});

	test('tapping the search icon expands the full-width search bar', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'mobile-only');

		await page.goto('/');
		await page.getByRole('button', { name: 'Search' }).click();
		await expect(page.getByRole('searchbox')).toBeVisible();
	});

	test('X button collapses the mobile search bar', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'mobile-only');

		await page.goto('/');
		await page.getByRole('button', { name: 'Search' }).click();
		await expect(page.getByRole('searchbox')).toBeVisible();

		await page.getByRole('button', { name: 'Close search' }).click();
		await expect(page.getByRole('searchbox')).not.toBeVisible();
	});

	test('mobile search bar closes after navigating to another page', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'mobile-only');

		await page.goto('/');
		await page.getByRole('button', { name: 'Search' }).click();
		await expect(page.getByRole('searchbox')).toBeVisible();

		// Navigate to another page; afterNavigate in Navbar closes mobileSearchOpen
		await page.goto('/explore');
		await expect(page.getByRole('searchbox')).not.toBeVisible();
	});

	test('mobile search dropdown is usable after expanding', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'mobile-only');

		await mockSearchApi(page);
		await page.goto('/');
		await page.getByRole('button', { name: 'Search' }).click();

		await page.getByRole('searchbox').fill('cl');
		await expect(page.getByRole('listbox')).toBeVisible({ timeout: 2000 });
	});
});

test.describe('Desktop search — always visible', () => {
	test('search input is visible in the navbar without any interaction', async ({
		page,
		isMobile
	}) => {
		test.skip(isMobile, 'desktop-only');

		await page.goto('/');
		await expect(page.getByRole('searchbox')).toBeVisible();
	});
});

test.describe('/ keyboard shortcut', () => {
	test('pressing / focuses the desktop search input', async ({ page, isMobile }) => {
		test.skip(isMobile, 'desktop-only');

		await page.goto('/');
		await page.keyboard.press('/');

		await expect(page.getByRole('searchbox')).toBeFocused();
	});

	test('pressing / on mobile expands the search bar', async ({ page, isMobile }) => {
		test.skip(!isMobile, 'mobile-only');

		await page.goto('/');
		// Ensure no input is focused (start from a neutral state)
		await page.keyboard.press('/');

		// The mobile search bar should now be open and focused
		await expect(page.getByRole('searchbox')).toBeVisible({ timeout: 1000 });
	});

	test('pressing / while focused on an input types the character instead of focusing search', async ({
		page,
		isMobile
	}) => {
		await mockSearchApi(page);
		await page.goto('/');
		await openSearchIfMobile(page, isMobile);

		// Focus the search input itself — it is an INPUT element
		const input = page.getByRole('searchbox');
		await input.click();
		await input.fill(''); // ensure it is empty

		// Press / while already inside an input — shouldHandleSlashKey returns false
		await page.keyboard.press('/');

		// '/' should be typed into the input, not caught by the global shortcut
		await expect(input).toHaveValue('/');
	});
});
