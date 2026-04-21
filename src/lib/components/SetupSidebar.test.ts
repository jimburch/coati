import { describe, it, expect } from 'vitest';

// Pure logic extracted from SetupSidebar.svelte for unit testing

function getIsFeatured(localFeatured: boolean | null, featuredAt: Date | string | null): boolean {
	return localFeatured !== null ? localFeatured : !!featuredAt;
}

function shouldShowReport(isLoggedIn: boolean, isOwner: boolean): boolean {
	return isLoggedIn && !isOwner;
}

function shouldShowDeleteBtn(isOwner: boolean): boolean {
	return isOwner;
}

function shouldShowFeatureToggle(isAdmin: boolean): boolean {
	return isAdmin;
}

type ActionResult =
	| { type: 'success'; data?: Record<string, unknown> | null }
	| { type: 'error' | 'failure' | 'redirect'; data?: Record<string, unknown> | null };

function parseFeaturedResult(result: ActionResult): boolean | null {
	if (result.type !== 'success' || !result.data) return null;
	return (result.data.featured as boolean) ?? null;
}

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

describe('visibility gates (getIsFeatured, shouldShow*)', () => {
	it('getIsFeatured: local override wins, otherwise derives from featuredAt', () => {
		expect(getIsFeatured(null, new Date())).toBe(true);
		expect(getIsFeatured(null, '2024-01-01T00:00:00Z')).toBe(true);
		expect(getIsFeatured(null, null)).toBe(false);
		expect(getIsFeatured(true, null)).toBe(true);
		expect(getIsFeatured(false, new Date())).toBe(false);
	});

	it('shouldShowReport: visible only for logged-in non-owners', () => {
		expect(shouldShowReport(true, false)).toBe(true);
		expect(shouldShowReport(true, true)).toBe(false);
		expect(shouldShowReport(false, false)).toBe(false);
		expect(shouldShowReport(false, true)).toBe(false);
	});

	it('shouldShowDeleteBtn / shouldShowFeatureToggle: direct boolean gates', () => {
		expect(shouldShowDeleteBtn(true)).toBe(true);
		expect(shouldShowDeleteBtn(false)).toBe(false);
		expect(shouldShowFeatureToggle(true)).toBe(true);
		expect(shouldShowFeatureToggle(false)).toBe(false);
	});
});

describe('parseFeaturedResult (optimistic featured update after ?/feature action)', () => {
	it('extracts featured boolean from a success result or returns null otherwise', () => {
		expect(parseFeaturedResult({ type: 'success', data: { featured: true } })).toBe(true);
		expect(parseFeaturedResult({ type: 'success', data: { featured: false } })).toBe(false);
		expect(parseFeaturedResult({ type: 'failure', data: { error: 'Not found' } })).toBeNull();
		expect(parseFeaturedResult({ type: 'success' })).toBeNull();
	});
});

describe('form/dialog state transitions', () => {
	it('report toggle flips the form, submit closes on success and leaves open on failure', () => {
		expect(simulateReportToggle(false)).toBe(true);
		expect(simulateReportToggle(true)).toBe(false);

		const success = simulateReportSubmit(true, true);
		expect(success).toEqual({ showReportForm: false, reportSubmitting: false });

		const failure = simulateReportSubmit(false, true);
		expect(failure).toEqual({ showReportForm: true, reportSubmitting: false });
	});
});
