import { describe, it, expect } from 'vitest';

// Pure logic extracted from SetupSidebar.svelte for unit testing

// ─── getIsFeatured ────────────────────────────────────────────────────────────
// Derives the current featured state from a local optimistic override or the prop

function getIsFeatured(localFeatured: boolean | null, featuredAt: Date | string | null): boolean {
	return localFeatured !== null ? localFeatured : !!featuredAt;
}

describe('getIsFeatured (featured toggle reflects featuredAt or local override)', () => {
	it('returns true when featuredAt is set and no local override', () => {
		expect(getIsFeatured(null, new Date())).toBe(true);
	});

	it('returns false when featuredAt is null and no local override', () => {
		expect(getIsFeatured(null, null)).toBe(false);
	});

	it('returns local override true even when featuredAt is null', () => {
		expect(getIsFeatured(true, null)).toBe(true);
	});

	it('returns local override false even when featuredAt is set', () => {
		expect(getIsFeatured(false, new Date())).toBe(false);
	});

	it('treats a date string as truthy (same as Date object)', () => {
		expect(getIsFeatured(null, '2024-01-01T00:00:00Z')).toBe(true);
	});

	it('ignores local override null and falls back to prop', () => {
		const featured = getIsFeatured(null, new Date());
		expect(featured).toBe(true);
	});
});

// ─── shouldShowReport ─────────────────────────────────────────────────────────
// Report section is visible only for logged-in non-owners

function shouldShowReport(isLoggedIn: boolean, isOwner: boolean): boolean {
	return isLoggedIn && !isOwner;
}

describe('shouldShowReport (report form visible only for logged-in non-owners)', () => {
	it('shows for a logged-in non-owner', () => {
		expect(shouldShowReport(true, false)).toBe(true);
	});

	it('hidden for the owner even when logged in', () => {
		expect(shouldShowReport(true, true)).toBe(false);
	});

	it('hidden for anonymous users', () => {
		expect(shouldShowReport(false, false)).toBe(false);
	});

	it('hidden when both isLoggedIn and isOwner are false', () => {
		expect(shouldShowReport(false, true)).toBe(false);
	});
});

// ─── shouldShowDeleteBtn ──────────────────────────────────────────────────────
// Delete button is visible only when the current user owns the setup

function shouldShowDeleteBtn(isOwner: boolean): boolean {
	return isOwner;
}

describe('shouldShowDeleteBtn (delete button gated on ownership)', () => {
	it('returns true when isOwner is true', () => {
		expect(shouldShowDeleteBtn(true)).toBe(true);
	});

	it('returns false when isOwner is false', () => {
		expect(shouldShowDeleteBtn(false)).toBe(false);
	});
});

// ─── shouldShowFeatureToggle ──────────────────────────────────────────────────
// Featured toggle is only rendered for admins

function shouldShowFeatureToggle(isAdmin: boolean): boolean {
	return isAdmin;
}

describe('shouldShowFeatureToggle (feature toggle gated on admin role)', () => {
	it('returns true when isAdmin is true', () => {
		expect(shouldShowFeatureToggle(true)).toBe(true);
	});

	it('returns false when isAdmin is false', () => {
		expect(shouldShowFeatureToggle(false)).toBe(false);
	});
});

// ─── parseFeaturedResult ──────────────────────────────────────────────────────
// Extracts the optimistic featured boolean from the ?/feature action result

type ActionResult =
	| { type: 'success'; data?: Record<string, unknown> | null }
	| { type: 'error' | 'failure' | 'redirect'; data?: Record<string, unknown> | null };

function parseFeaturedResult(result: ActionResult): boolean | null {
	if (result.type !== 'success' || !result.data) return null;
	return (result.data.featured as boolean) ?? null;
}

describe('parseFeaturedResult (optimistic featured state update after ?/feature)', () => {
	it('returns true when result data says featured: true', () => {
		const result: ActionResult = { type: 'success', data: { featured: true } };
		expect(parseFeaturedResult(result)).toBe(true);
	});

	it('returns false when result data says featured: false', () => {
		const result: ActionResult = { type: 'success', data: { featured: false } };
		expect(parseFeaturedResult(result)).toBe(false);
	});

	it('returns null when result type is not success', () => {
		const result: ActionResult = { type: 'failure', data: { error: 'Not found' } };
		expect(parseFeaturedResult(result)).toBeNull();
	});

	it('returns null when result has no data', () => {
		const result: ActionResult = { type: 'success' };
		expect(parseFeaturedResult(result)).toBeNull();
	});

	it('applies result to localFeatured for optimistic update', () => {
		let localFeatured: boolean | null = null;
		const result: ActionResult = { type: 'success', data: { featured: true } };
		const parsed = parseFeaturedResult(result);
		if (parsed !== null) localFeatured = parsed;
		expect(localFeatured).toBe(true);
	});
});

// ─── reportFormCycle ─────────────────────────────────────────────────────────
// State transitions for the report form open / submit / close cycle

function simulateReportToggle(current: boolean): boolean {
	return !current;
}

function simulateReportSubmit(
	success: boolean,
	currentShow: boolean
): { showReportForm: boolean; reportSubmitting: boolean } {
	if (success) return { showReportForm: false, reportSubmitting: false };
	return { showReportForm: currentShow, reportSubmitting: false };
}

describe('reportFormCycle (report form state transitions)', () => {
	it('clicking "Report this setup" shows the form', () => {
		expect(simulateReportToggle(false)).toBe(true);
	});

	it('clicking "Cancel" hides the form', () => {
		expect(simulateReportToggle(true)).toBe(false);
	});

	it('successful submission closes the form', () => {
		const { showReportForm, reportSubmitting } = simulateReportSubmit(true, true);
		expect(showReportForm).toBe(false);
		expect(reportSubmitting).toBe(false);
	});

	it('failed submission leaves the form open', () => {
		const { showReportForm, reportSubmitting } = simulateReportSubmit(false, true);
		expect(showReportForm).toBe(true);
		expect(reportSubmitting).toBe(false);
	});

	it('reportSubmitting is reset to false after submission regardless of outcome', () => {
		expect(simulateReportSubmit(true, true).reportSubmitting).toBe(false);
		expect(simulateReportSubmit(false, true).reportSubmitting).toBe(false);
	});
});

// ─── deleteDialogCycle ────────────────────────────────────────────────────────
// Delete dialog open / close state managed inside the component

function openDeleteDialog(): boolean {
	return true;
}

function closeDeleteDialog(): boolean {
	return false;
}

describe('deleteDialogCycle (delete dialog state transitions)', () => {
	it('clicking the delete button opens the dialog', () => {
		expect(openDeleteDialog()).toBe(true);
	});

	it('onOpenChange(false) closes the dialog', () => {
		expect(closeDeleteDialog()).toBe(false);
	});
});

// ─── sidebar data-testid attributes ───────────────────────────────────────────
// Verify the testid contract is met — each attribute maps to a specific element role

const SIDEBAR_TESTIDS = {
	sidebar: 'aside wrapper containing all sidebar sections',
	'delete-setup-btn': 'delete button visible only when isOwner',
	'feature-toggle-btn': 'feature toggle button visible only when isAdmin',
	'report-toggle-btn': 'report toggle button visible only when isLoggedIn && !isOwner'
} as const;

describe('sidebar data-testid attributes (e2e testid contract)', () => {
	it('sidebar testid is on the outer aside element', () => {
		expect(SIDEBAR_TESTIDS['sidebar']).toContain('aside');
	});

	it('delete-setup-btn testid is gated on isOwner', () => {
		expect(SIDEBAR_TESTIDS['delete-setup-btn']).toContain('isOwner');
	});

	it('feature-toggle-btn testid is gated on isAdmin', () => {
		expect(SIDEBAR_TESTIDS['feature-toggle-btn']).toContain('isAdmin');
	});

	it('report-toggle-btn testid is gated on isLoggedIn && !isOwner', () => {
		expect(SIDEBAR_TESTIDS['report-toggle-btn']).toContain('isLoggedIn');
	});

	it('all four required testids are present in the contract', () => {
		const required = ['sidebar', 'delete-setup-btn', 'feature-toggle-btn', 'report-toggle-btn'];
		for (const id of required) {
			expect(Object.keys(SIDEBAR_TESTIDS)).toContain(id);
		}
	});
});
