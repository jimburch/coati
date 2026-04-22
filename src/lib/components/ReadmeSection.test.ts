import { describe, it, expect, vi } from 'vitest';
import {
	shouldRenderReadmeSection,
	shouldShowAddReadmeCard,
	isSaveDisabled
} from './readmeSectionView';

// Pure logic extracted from ReadmeSection.svelte for unit testing

function getDisplayedReadmeHtml(
	localReadmeHtml: string | null,
	propReadmeHtml: string | null
): string | null {
	return localReadmeHtml !== null ? localReadmeHtml : propReadmeHtml;
}

function hasReadmeContent(html: string | null): boolean {
	return !!html;
}

function shouldShowEditButton(isOwner: boolean): boolean {
	return isOwner;
}

function initEditContent(readmeRaw: string | null): string {
	return readmeRaw ?? '';
}

type EditTab = 'edit' | 'preview';
function getActiveTabPanel(tab: EditTab): 'textarea' | 'preview' {
	return tab === 'edit' ? 'textarea' : 'preview';
}

type ActionResult =
	| { type: 'success'; data?: Record<string, unknown> | null }
	| { type: 'error' | 'failure' | 'redirect'; data?: Record<string, unknown> | null };

function parsePreviewResult(result: ActionResult): string | null {
	if (result.type === 'success') {
		return (result.data?.previewHtml as string | null) ?? null;
	}
	return null;
}

interface SavePayload {
	readmeHtml: string | null;
	updatedAt: Date | null;
}

function parseSaveResult(result: ActionResult): SavePayload | null {
	if (result.type !== 'success' || !result.data) return null;
	const readmeHtml = (result.data.readmeHtml as string | null) ?? null;
	const updatedAt = result.data.updatedAt ? new Date(result.data.updatedAt as string) : null;
	return { readmeHtml, updatedAt };
}

describe('README display derivations', () => {
	it('getDisplayedReadmeHtml: local override wins (even empty string), otherwise falls back to prop', () => {
		expect(getDisplayedReadmeHtml(null, '<p>Hello</p>')).toBe('<p>Hello</p>');
		expect(getDisplayedReadmeHtml('<p>Updated</p>', '<p>Original</p>')).toBe('<p>Updated</p>');
		expect(getDisplayedReadmeHtml(null, null)).toBeNull();
		// Empty string local override: README cleared
		expect(getDisplayedReadmeHtml('', '<p>Old content</p>')).toBe('');
	});

	it('hasReadmeContent / shouldShowEditButton: render flags for view mode', () => {
		expect(hasReadmeContent('<p>Hello</p>')).toBe(true);
		expect(hasReadmeContent(null)).toBe(false);
		expect(hasReadmeContent('')).toBe(false);

		expect(shouldShowEditButton(true)).toBe(true);
		expect(shouldShowEditButton(false)).toBe(false);
	});

	it('initEditContent: seeds textarea with raw markdown (or empty string when null)', () => {
		const md = '# Title\n\n- item 1\n- item 2\n\n```js\nconsole.log("hi");\n```';
		expect(initEditContent(md)).toBe(md);
		expect(initEditContent('# Hello\n\nSome content.')).toBe('# Hello\n\nSome content.');
		expect(initEditContent(null)).toBe('');
	});

	it('getActiveTabPanel: maps edit/preview tabs to their panels', () => {
		expect(getActiveTabPanel('edit')).toBe('textarea');
		expect(getActiveTabPanel('preview')).toBe('preview');
	});
});

describe('README section visibility', () => {
	it('shouldRenderReadmeSection: hides the section only for non-owner viewing a null README', () => {
		expect(shouldRenderReadmeSection({ isOwner: false, readmeHtml: null })).toBe(false);
		expect(shouldRenderReadmeSection({ isOwner: true, readmeHtml: null })).toBe(true);
		expect(shouldRenderReadmeSection({ isOwner: false, readmeHtml: '<p>Hi</p>' })).toBe(true);
		expect(shouldRenderReadmeSection({ isOwner: true, readmeHtml: '<p>Hi</p>' })).toBe(true);
	});

	it('shouldShowAddReadmeCard: shows the empty-state card only for owner viewing a null README', () => {
		expect(shouldShowAddReadmeCard({ isOwner: true, readmeHtml: null })).toBe(true);
		expect(shouldShowAddReadmeCard({ isOwner: false, readmeHtml: null })).toBe(false);
		expect(shouldShowAddReadmeCard({ isOwner: true, readmeHtml: '<p>Hi</p>' })).toBe(false);
		expect(shouldShowAddReadmeCard({ isOwner: false, readmeHtml: '<p>Hi</p>' })).toBe(false);
	});
});

describe('isSaveDisabled (split save-button rule)', () => {
	it('disables save on empty content when opened from the null state (Add-a-README)', () => {
		expect(isSaveDisabled({ sourceHadReadme: false, textareaContent: '', saving: false })).toBe(
			true
		);
		expect(
			isSaveDisabled({ sourceHadReadme: false, textareaContent: '   \n\t', saving: false })
		).toBe(true);
	});

	it('enables save once the user has typed non-whitespace into an empty editor', () => {
		expect(isSaveDisabled({ sourceHadReadme: false, textareaContent: '# Hi', saving: false })).toBe(
			false
		);
	});

	it('always allows saving from an existing README, even when cleared (delete flow)', () => {
		expect(isSaveDisabled({ sourceHadReadme: true, textareaContent: '', saving: false })).toBe(
			false
		);
		expect(isSaveDisabled({ sourceHadReadme: true, textareaContent: '   ', saving: false })).toBe(
			false
		);
		expect(
			isSaveDisabled({ sourceHadReadme: true, textareaContent: '# edited', saving: false })
		).toBe(false);
	});

	it('disables save while a save is in flight regardless of state', () => {
		expect(isSaveDisabled({ sourceHadReadme: true, textareaContent: '# Hi', saving: true })).toBe(
			true
		);
		expect(isSaveDisabled({ sourceHadReadme: false, textareaContent: '# Hi', saving: true })).toBe(
			true
		);
	});
});

describe('server action result parsers', () => {
	it('parsePreviewResult: returns previewHtml on success, null otherwise', () => {
		expect(parsePreviewResult({ type: 'success', data: { previewHtml: '<p>Preview</p>' } })).toBe(
			'<p>Preview</p>'
		);
		expect(parsePreviewResult({ type: 'success', data: { previewHtml: null } })).toBeNull();
		expect(parsePreviewResult({ type: 'failure', data: { error: 'bad' } })).toBeNull();
		expect(parsePreviewResult({ type: 'success' })).toBeNull();
	});

	it('parseSaveResult: extracts readmeHtml + Date(updatedAt), returns null on non-success', () => {
		const iso = '2026-04-16T12:00:00.000Z';
		const onSuccess = parseSaveResult({
			type: 'success',
			data: { readmeHtml: '<p>Saved</p>', updatedAt: iso }
		});
		expect(onSuccess).not.toBeNull();
		expect(onSuccess!.readmeHtml).toBe('<p>Saved</p>');
		expect(onSuccess!.updatedAt).toBeInstanceOf(Date);
		expect(onSuccess!.updatedAt!.toISOString()).toBe(iso);

		// updatedAt absent → null Date
		const noDate = parseSaveResult({ type: 'success', data: { readmeHtml: '<p>Saved</p>' } });
		expect(noDate!.updatedAt).toBeNull();

		// Non-success → null payload
		expect(parseSaveResult({ type: 'failure' })).toBeNull();

		// onSaved callback receives the parsed payload
		const onSaved = vi.fn();
		const withDate = parseSaveResult({
			type: 'success',
			data: { readmeHtml: '<h1>Hi</h1>', updatedAt: '2026-04-16T15:30:00.000Z' }
		});
		if (withDate) onSaved({ updatedAt: withDate.updatedAt });
		expect(onSaved).toHaveBeenCalledWith({ updatedAt: new Date('2026-04-16T15:30:00.000Z') });
	});
});
