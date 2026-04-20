import { describe, it, expect } from 'vitest';

// Pure logic extracted from SetupHeader.svelte for unit testing

function getDisplayedAboutDisplay(
	localAboutDisplay: string | null,
	propDisplay: string | null,
	propName: string
): string {
	return localAboutDisplay !== null ? localAboutDisplay : (propDisplay ?? propName);
}

function getDisplayedAboutDescription(
	localAboutDescription: string | null,
	propDescription: string | null
): string {
	return localAboutDescription !== null ? localAboutDescription : (propDescription ?? '');
}

function shouldShowEditPencil(isOwner: boolean): boolean {
	return isOwner;
}

function initAboutInputs(
	displayedDisplay: string,
	displayedDescription: string
): { displayInput: string; descriptionInput: string } {
	return { displayInput: displayedDisplay, descriptionInput: displayedDescription };
}

type ActionResult =
	| { type: 'success'; data?: Record<string, unknown> | null }
	| { type: 'error' | 'failure' | 'redirect'; data?: Record<string, unknown> | null };

interface SaveAboutPayload {
	display: string | null;
	description: string | null;
}

function parseSaveAboutResult(result: ActionResult): SaveAboutPayload | null {
	if (result.type !== 'success' || !result.data) return null;
	return {
		display: (result.data.display as string | null) ?? null,
		description: (result.data.description as string | null) ?? null
	};
}

describe('about-section display derivations', () => {
	it('getDisplayedAboutDisplay: local override > propDisplay > propName fallback chain', () => {
		expect(getDisplayedAboutDisplay(null, 'My Setup', 'my-setup')).toBe('My Setup');
		expect(getDisplayedAboutDisplay(null, null, 'my-setup')).toBe('my-setup');
		expect(getDisplayedAboutDisplay('Updated Name', 'Original Display', 'slug')).toBe(
			'Updated Name'
		);
		// Empty-string local override wins over the prop (display cleared)
		expect(getDisplayedAboutDisplay('', 'Original', 'slug')).toBe('');
		// Always returns a string
		expect(typeof getDisplayedAboutDisplay(null, null, 'fallback-slug')).toBe('string');
	});

	it('getDisplayedAboutDescription: local override > prop > empty string', () => {
		expect(getDisplayedAboutDescription(null, 'A great setup')).toBe('A great setup');
		expect(getDisplayedAboutDescription(null, null)).toBe('');
		expect(getDisplayedAboutDescription('Updated desc', 'Original desc')).toBe('Updated desc');
		expect(getDisplayedAboutDescription('', 'Has description')).toBe('');
	});

	it('shouldShowEditPencil: gated on isOwner', () => {
		expect(shouldShowEditPencil(true)).toBe(true);
		expect(shouldShowEditPencil(false)).toBe(false);
	});

	it('initAboutInputs: seeds form inputs with the currently displayed values', () => {
		expect(initAboutInputs('My Setup', 'A description')).toEqual({
			displayInput: 'My Setup',
			descriptionInput: 'A description'
		});
		expect(initAboutInputs('My Setup', '')).toEqual({
			displayInput: 'My Setup',
			descriptionInput: ''
		});
		expect(initAboutInputs('Previously Saved Name', '').displayInput).toBe('Previously Saved Name');
	});
});

describe('parseSaveAboutResult', () => {
	it('extracts display/description on success, returns null on non-success or missing data', () => {
		expect(
			parseSaveAboutResult({
				type: 'success',
				data: { display: 'New Name', description: 'New desc' }
			})
		).toEqual({ display: 'New Name', description: 'New desc' });

		expect(
			parseSaveAboutResult({ type: 'success', data: { display: 'New Name' } })!.description
		).toBeNull();
		expect(
			parseSaveAboutResult({ type: 'success', data: { description: 'Only desc' } })!.display
		).toBeNull();

		expect(parseSaveAboutResult({ type: 'failure', data: { error: 'Unauthorized' } })).toBeNull();
		expect(parseSaveAboutResult({ type: 'success' })).toBeNull();
	});

	it('save callback: parsed payload updates local overrides and closes the form', () => {
		let localAboutDisplay: string | null = null;
		let localAboutDescription: string | null = null;
		let aboutEditMode = true;

		const payload = parseSaveAboutResult({
			type: 'success',
			data: { display: 'Saved Display', description: 'Saved desc' }
		});
		if (payload) {
			localAboutDisplay = payload.display;
			localAboutDescription = payload.description;
			aboutEditMode = false;
		}

		expect(localAboutDisplay).toBe('Saved Display');
		expect(localAboutDescription).toBe('Saved desc');
		expect(aboutEditMode).toBe(false);
	});
});
