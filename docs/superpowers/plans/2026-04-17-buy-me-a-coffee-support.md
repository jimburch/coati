# Buy Me a Coffee Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-intrusive Buy Me a Coffee (BMC) support surface to the Coati web app (footer + `/support` page) and GitHub repo (FUNDING.yml + README badge + README section).

**Architecture:** Single source of truth module exports the BMC URL, GitHub repo URL, and BMC handle. A new static `/support` page under `(public)/` consumes those constants. The footer gets a "Support" link. `.github/FUNDING.yml` and `README.md` are updated to mirror the support surface on GitHub. No schema, API, or auth changes.

**Tech Stack:** SvelteKit 2, TypeScript (strict), Tailwind CSS, shadcn-svelte, Vitest (unit), Playwright (e2e).

**Spec:** `docs/superpowers/specs/2026-04-17-buy-me-a-coffee-support-design.md`

**BMC handle:** `jimburch` → `https://buymeacoffee.com/jimburch`

---

## Repo conventions (read once before starting)

- Per `CLAUDE.md`: **Claude must not run `git add`, `git commit`, or `git push`.** Commit steps in this plan are phrased as "Checkpoint — stop and let the user commit." Do not skip the checkpoint — stop, report status, and wait for the user.
- Pages under `src/routes/(public)/` are SSR-enabled via the group's `+layout.ts`. Do not add a `+page.server.ts` for static pages.
- Use `OgMeta` from `$lib/components/OgMeta.svelte` for social/OG tags. It does NOT set `<title>`; the page must set it via `<svelte:head><title>...</title></svelte:head>`.
- Shadcn-svelte `Button` is imported as `import { Button } from '$lib/components/ui/button';`.
- Playwright `playwright.config.ts` runs e2e files matching `**/*.e2e.{ts,js}` against `desktop` and `mobile` projects.
- Before finalizing, run `pnpm check`, `pnpm lint`, and `pnpm test:unit --run`.
- **Testing strategy note:** The spec mentions a component render unit test at `+page.svelte.test.ts`. Project convention (see `src/routes/(public)/guide/guide.test.ts`) unit-tests only extractable logic/data and defers rendered-DOM assertions to Playwright. This plan follows that convention: Task 1 unit-tests the constants, and Task 4 e2e covers every render assertion the spec called for (heading, BMC href/target/rel, all "Other ways" link hrefs). No component-render unit test is created.

---

## File Structure

**Create:**
- `src/lib/config/support.ts` — shared constants (BMC URL, BMC handle, GitHub repo URL).
- `src/lib/config/support.test.ts` — unit tests for the constants module.
- `src/routes/(public)/support/+page.svelte` — the `/support` page.
- `src/routes/(public)/support/page.svelte.e2e.ts` — Playwright e2e.
- `.github/FUNDING.yml` — GitHub native Sponsor button config.

**Modify:**
- `src/lib/components/Footer.svelte` — add a "Support" link between "How to use Coati" and "Privacy".
- `README.md` — add BMC badge to top badge row and a "Support" section above `## License`.

---

## Task 1: Create the shared support constants module

**Files:**
- Create: `src/lib/config/support.ts`
- Create: `src/lib/config/support.test.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/lib/config/support.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { BMC_URL, BMC_HANDLE, GITHUB_REPO_URL } from './support';

describe('support constants', () => {
	it('BMC_HANDLE is jimburch', () => {
		expect(BMC_HANDLE).toBe('jimburch');
	});

	it('BMC_URL points to buymeacoffee.com/jimburch with https', () => {
		expect(BMC_URL).toBe('https://buymeacoffee.com/jimburch');
	});

	it('BMC_URL contains BMC_HANDLE (consistency)', () => {
		expect(BMC_URL.endsWith(`/${BMC_HANDLE}`)).toBe(true);
	});

	it('GITHUB_REPO_URL is the coati repo on github.com with https', () => {
		expect(GITHUB_REPO_URL).toBe('https://github.com/jimburch/coati');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit --run src/lib/config/support.test.ts`
Expected: FAIL — module `./support` does not exist.

- [ ] **Step 3: Create the constants module**

Create `src/lib/config/support.ts`:

```typescript
export const BMC_HANDLE = 'jimburch';
export const BMC_URL = `https://buymeacoffee.com/${BMC_HANDLE}`;
export const GITHUB_REPO_URL = 'https://github.com/jimburch/coati';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit --run src/lib/config/support.test.ts`
Expected: PASS — all 4 assertions green.

- [ ] **Step 5: Checkpoint — stop and let the user commit**

Suggested message: `feat(support): add shared BMC/GitHub URL constants`

Files: `src/lib/config/support.ts`, `src/lib/config/support.test.ts`

Stop here and surface the files changed to the user. Do not run git commands.

---

## Task 2: Add the "Support" link to the footer

**Files:**
- Modify: `src/lib/components/Footer.svelte`

- [ ] **Step 1: Read the current Footer**

Expected current content (nav section):

```svelte
<nav class="text-muted-foreground flex gap-3 text-xs lg:gap-4 lg:text-sm">
	<a href="/guide" class="hover:text-foreground transition-colors">How to use Coati</a>
	<a href="/privacy" class="hover:text-foreground transition-colors">Privacy</a>
	<a href="/terms" class="hover:text-foreground transition-colors">Terms</a>
	<a
		href="https://github.com/jimburch/coati"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:text-foreground transition-colors">GitHub</a
	>
</nav>
```

- [ ] **Step 2: Insert the Support link between "How to use Coati" and "Privacy"**

Edit the `<nav>` element so the link order becomes: How to use Coati → **Support** → Privacy → Terms → GitHub.

New markup:

```svelte
<nav class="text-muted-foreground flex gap-3 text-xs lg:gap-4 lg:text-sm">
	<a href="/guide" class="hover:text-foreground transition-colors">How to use Coati</a>
	<a href="/support" class="hover:text-foreground transition-colors">Support</a>
	<a href="/privacy" class="hover:text-foreground transition-colors">Privacy</a>
	<a href="/terms" class="hover:text-foreground transition-colors">Terms</a>
	<a
		href="https://github.com/jimburch/coati"
		target="_blank"
		rel="noopener noreferrer"
		class="hover:text-foreground transition-colors">GitHub</a
	>
</nav>
```

- [ ] **Step 3: Verify the change visually by starting dev server**

Run: `pnpm dev` (if not already running).

Navigate to `http://localhost:5173/`, scroll to footer, confirm "Support" link is visible between "How to use Coati" and "Privacy". Clicking it will 404 until Task 3.

- [ ] **Step 4: Checkpoint — stop and let the user commit**

Suggested message: `feat(footer): add Support link to footer nav`

Files: `src/lib/components/Footer.svelte`

---

## Task 3: Create the `/support` page (static content)

**Files:**
- Create: `src/routes/(public)/support/+page.svelte`

- [ ] **Step 1: Create the page with full content**

Create `src/routes/(public)/support/+page.svelte`:

```svelte
<script lang="ts">
	import OgMeta from '$lib/components/OgMeta.svelte';
	import { Button } from '$lib/components/ui/button';
	import { BMC_URL, GITHUB_REPO_URL } from '$lib/config/support';

	const otherWays: Array<{ emoji: string; label: string; href: string; external: boolean }> = [
		{ emoji: '⭐', label: 'Star the repo on GitHub', href: GITHUB_REPO_URL, external: true },
		{ emoji: '📣', label: "Share a setup you've built", href: '/new', external: false },
		{
			emoji: '🐞',
			label: 'Report a bug or request a feature',
			href: `${GITHUB_REPO_URL}/issues/new`,
			external: true
		},
		{ emoji: '🤝', label: 'Contribute on GitHub', href: GITHUB_REPO_URL, external: true }
	];
</script>

<svelte:head>
	<title>Support Coati</title>
</svelte:head>

<OgMeta
	title="Support Coati"
	description="Coati is free and open source. If it's useful to you, here are some ways to help it keep going."
/>

<div class="mx-auto max-w-2xl px-4 py-12 lg:py-16">
	<h1 class="text-foreground mb-4 text-3xl font-bold tracking-tight lg:text-4xl">Support Coati</h1>
	<p class="text-muted-foreground mb-10 leading-relaxed">
		Coati is free and open source. If it's useful to you, here are some ways to help it keep going.
	</p>

	<section class="bg-muted/40 mb-10 rounded-lg border p-6">
		<h2 class="text-foreground mb-2 text-xl font-semibold">☕ Buy me a coffee</h2>
		<p class="text-muted-foreground mb-4 text-sm leading-relaxed">
			A one-time thank-you goes toward hosting and the domain.
		</p>
		<Button
			href={BMC_URL}
			target="_blank"
			rel="noopener noreferrer"
			data-testid="bmc-button"
		>
			Buy me a coffee
		</Button>
	</section>

	<section>
		<h2 class="text-foreground mb-4 text-xl font-semibold">Other ways to help</h2>
		<ul class="text-muted-foreground space-y-2">
			{#each otherWays as way (way.label)}
				<li>
					<span aria-hidden="true">{way.emoji}</span>
					<a
						href={way.href}
						class="text-foreground underline hover:no-underline"
						target={way.external ? '_blank' : undefined}
						rel={way.external ? 'noopener noreferrer' : undefined}
					>
						{way.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
```

Note: The shadcn-svelte `Button` forwards `href`, `target`, and `rel` and renders as an `<a>` when `href` is set — this matches existing usage in the codebase. If the Button component in this project does NOT forward these when rendered as an anchor, fall back to wrapping with an anchor: `<a href={BMC_URL} target="_blank" rel="noopener noreferrer"><Button>Buy me a coffee</Button></a>`. Verify in Step 2 below.

- [ ] **Step 2: Verify the page renders in the dev server**

Run: `pnpm dev` (if not already running).

Navigate to `http://localhost:5173/support` and confirm:
- H1 "Support Coati" is visible.
- BMC button is visible, inspecting it in DevTools shows `href="https://buymeacoffee.com/jimburch"`, `target="_blank"`, and `rel` contains `noopener` and `noreferrer`.
- If those attributes are missing from the button, replace the `<Button>` with the `<a><Button>...</Button></a>` fallback noted in Step 1, save, reload, and re-verify.
- All four "Other ways to help" links are visible; external links open in a new tab.

- [ ] **Step 3: Capture screenshots (per CLAUDE.md UI workflow)**

Run:

```bash
npx playwright screenshot --viewport-size=1280,720 http://localhost:5173/support screenshots/support-page-desktop.png
npx playwright screenshot --viewport-size=430,932 http://localhost:5173/support screenshots/support-page-mobile.png
```

Read each screenshot file back and confirm layout, spacing, and button prominence look correct on both viewports.

- [ ] **Step 4: Checkpoint — stop and let the user commit**

Suggested message: `feat(support): add /support page with BMC button and other ways to help`

Files: `src/routes/(public)/support/+page.svelte`

---

## Task 4: Add the e2e test for the `/support` page and footer link

**Files:**
- Create: `src/routes/(public)/support/page.svelte.e2e.ts`

- [ ] **Step 1: Write the e2e test file**

Create `src/routes/(public)/support/page.svelte.e2e.ts`:

```typescript
import { expect, test } from '@playwright/test';

const SUPPORT_URL = '/support';
const BMC_URL = 'https://buymeacoffee.com/jimburch';
const GITHUB_REPO_URL = 'https://github.com/jimburch/coati';

test('page loads with correct title', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	await expect(page).toHaveTitle('Support Coati');
});

test('page renders the h1 heading', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	await expect(page.getByRole('heading', { name: 'Support Coati', level: 1 })).toBeVisible();
});

test('BMC button is visible with correct href, target, and rel', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	const bmc = page.getByTestId('bmc-button');
	await expect(bmc).toBeVisible();
	await expect(bmc).toHaveAttribute('href', BMC_URL);
	await expect(bmc).toHaveAttribute('target', '_blank');
	const rel = await bmc.getAttribute('rel');
	expect(rel).toContain('noopener');
	expect(rel).toContain('noreferrer');
});

test('all four "Other ways to help" links are present', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	await expect(page.getByRole('link', { name: 'Star the repo on GitHub' })).toHaveAttribute(
		'href',
		GITHUB_REPO_URL
	);
	await expect(page.getByRole('link', { name: "Share a setup you've built" })).toHaveAttribute(
		'href',
		'/new'
	);
	await expect(
		page.getByRole('link', { name: 'Report a bug or request a feature' })
	).toHaveAttribute('href', `${GITHUB_REPO_URL}/issues/new`);
	await expect(page.getByRole('link', { name: 'Contribute on GitHub' })).toHaveAttribute(
		'href',
		GITHUB_REPO_URL
	);
});

test('external "Other ways" links open in new tab with noopener noreferrer', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	const starLink = page.getByRole('link', { name: 'Star the repo on GitHub' });
	await expect(starLink).toHaveAttribute('target', '_blank');
	const rel = await starLink.getAttribute('rel');
	expect(rel).toContain('noopener');
	expect(rel).toContain('noreferrer');
});

test('internal "Share a setup" link does not open in a new tab', async ({ page }) => {
	await page.goto(SUPPORT_URL);
	const shareLink = page.getByRole('link', { name: "Share a setup you've built" });
	const target = await shareLink.getAttribute('target');
	expect(target).toBeNull();
});

test('page is accessible without authentication', async ({ page }) => {
	await page.context().clearCookies();
	await page.goto(SUPPORT_URL);
	await expect(page.getByRole('heading', { name: 'Support Coati', level: 1 })).toBeVisible();
});

test('footer contains "Support" link pointing to /support', async ({ page }) => {
	await page.goto('/');
	const footerLink = page.locator('footer').getByRole('link', { name: 'Support' });
	await expect(footerLink).toBeVisible();
	await expect(footerLink).toHaveAttribute('href', '/support');
});

test('footer "Support" link navigates to /support', async ({ page }) => {
	await page.goto('/');
	await page.locator('footer').getByRole('link', { name: 'Support' }).click();
	await expect(page).toHaveURL(/\/support$/);
	await expect(page.getByRole('heading', { name: 'Support Coati', level: 1 })).toBeVisible();
});

test('mobile: page has no horizontal overflow', async ({ page, isMobile }) => {
	test.skip(!isMobile, 'mobile-only test');
	await page.goto(SUPPORT_URL);
	const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
	const viewportWidth = await page.evaluate(() => window.innerWidth);
	expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
```

- [ ] **Step 2: Run the e2e test — desktop + mobile**

Run: `pnpm test:e2e --grep "support"` (targets files containing "support" in path).

If the above grep doesn't target the file as expected, run the full e2e file directly:

```bash
pnpm exec playwright test src/routes/\(public\)/support/page.svelte.e2e.ts
```

Expected: all tests PASS on both the `desktop` and `mobile` Playwright projects.

If the "BMC button has target/rel" test fails, revisit Task 3 Step 2 — the shadcn-svelte Button may not be forwarding anchor attributes. Apply the `<a><Button>...</Button></a>` fallback, then re-run.

- [ ] **Step 3: Checkpoint — stop and let the user commit**

Suggested message: `test(support): add e2e for /support page and footer link`

Files: `src/routes/(public)/support/page.svelte.e2e.ts`

---

## Task 5: Add `.github/FUNDING.yml`

**Files:**
- Create: `.github/FUNDING.yml`

- [ ] **Step 1: Confirm the `.github` directory exists**

Run: `ls .github` — if the directory does not exist, it will be created when the file is written; no action needed.

- [ ] **Step 2: Create the FUNDING config**

Create `.github/FUNDING.yml`:

```yaml
# https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository
buy_me_a_coffee: jimburch
```

- [ ] **Step 3: Validate the YAML**

Run: `pnpm exec js-yaml .github/FUNDING.yml` if `js-yaml` is installed, OR open the file and verify it is a single `key: value` pair with no syntax errors.

Alternative validation via Node one-liner:

```bash
node -e "const y = require('yaml'); console.log(y.parse(require('fs').readFileSync('.github/FUNDING.yml', 'utf8')))"
```

Expected output: `{ buy_me_a_coffee: 'jimburch' }`.

If neither `yaml` nor `js-yaml` is available, skip programmatic validation — the file is two lines and can be eyeballed.

- [ ] **Step 4: Checkpoint — stop and let the user commit**

Suggested message: `chore(github): add FUNDING.yml for Buy Me a Coffee sponsor button`

Files: `.github/FUNDING.yml`

Note: GitHub surfaces the "♥ Sponsor" button only after the file is merged into the default branch (`main`). No action is visible on the feature branch itself.

---

## Task 6: Update `README.md` with BMC badge and Support section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the BMC badge to the top badge row**

The current top badge row ends with the License badge on line 10 of `README.md`:

```markdown
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)
```

Append the BMC badge on a new line immediately after the License line, before the blank line that precedes the project title:

```markdown
[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](./LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/support-buy%20me%20a%20coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/jimburch)
```

- [ ] **Step 2: Add a `## Support` section immediately above the `## License` section**

The current ending of `README.md` is:

```markdown
## License

ISC
```

Insert a new section above `## License` so the bottom of the file becomes:

```markdown
## Support

Coati is free and open source. If it's useful to you, you can support development at [buymeacoffee.com/jimburch](https://buymeacoffee.com/jimburch), [star the repo](https://github.com/jimburch/coati), or share a setup you've built. See [coati.sh/support](https://coati.sh/support) for more ways to help.

## License

ISC
```

- [ ] **Step 3: Verify the README renders correctly**

Open `README.md` in a Markdown preview (VS Code: Cmd-Shift-V) and confirm:
- Top badge row now includes the yellow BMC badge.
- A new "Support" section appears above "License".
- All three links in the Support section are active.

- [ ] **Step 4: Checkpoint — stop and let the user commit**

Suggested message: `docs(readme): add BMC badge and Support section`

Files: `README.md`

---

## Task 7: Final verification — checks, lint, tests

**Files:** (none — verification only)

- [ ] **Step 1: Type check**

Run: `pnpm check`
Expected: exits 0 with no errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: exits 0 with no errors.

- [ ] **Step 3: Unit tests**

Run: `pnpm test:unit --run`
Expected: exits 0. The new `src/lib/config/support.test.ts` appears in the test output with 4 passing tests.

- [ ] **Step 4: E2E tests (both projects)**

Run: `pnpm test:e2e`
Expected: exits 0. Both `desktop` and `mobile` projects pass, including the new `src/routes/(public)/support/page.svelte.e2e.ts` tests.

- [ ] **Step 5: Manual smoke — dev server**

Run: `pnpm dev` (if not already running) and exercise:

1. Load `/` → footer shows "Support" link.
2. Click "Support" → lands on `/support` with H1 "Support Coati".
3. Click the "Buy me a coffee" button → opens `https://buymeacoffee.com/jimburch` in a new tab.
4. Click each "Other ways to help" link → external links open in a new tab; "Share a setup" navigates in-app to `/new`.
5. Load `/support` on mobile viewport (DevTools responsive mode, 430x932) → no horizontal overflow, button and list remain readable.

- [ ] **Step 6: Confirm no regressions in unrelated e2e**

If time allows, spot-check `/guide` and `/privacy` load without errors — they share the same `(public)` layout, so a regression in the footer would show up there.

- [ ] **Step 7: Final checkpoint — summarize status for the user**

Report: all 7 tasks complete, checks/lint/unit/e2e all green, screenshots captured at `screenshots/support-page-{desktop,mobile}.png`. The user commits the batch (or reviews the incremental commits made at each prior checkpoint) and opens the PR.

Do not run git commands or open a PR — that is the user's responsibility per `CLAUDE.md`.
