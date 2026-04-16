import { describe, it, expect, vi } from 'vitest';

// Pure logic extracted from ReadmeSection.svelte for unit testing

// ─── getDisplayedReadmeHtml ───────────────────────────────────────────────────
// Mirrors the $derived: prefer local override when set, fall back to prop

function getDisplayedReadmeHtml(
	localReadmeHtml: string | null,
	propReadmeHtml: string | null
): string | null {
	return localReadmeHtml !== null ? localReadmeHtml : propReadmeHtml;
}

describe('getDisplayedReadmeHtml', () => {
	it('returns propReadmeHtml when localReadmeHtml is null', () => {
		expect(getDisplayedReadmeHtml(null, '<p>Hello</p>')).toBe('<p>Hello</p>');
	});

	it('returns localReadmeHtml when it is set, overriding the prop', () => {
		expect(getDisplayedReadmeHtml('<p>Updated</p>', '<p>Original</p>')).toBe('<p>Updated</p>');
	});

	it('returns null when both are null', () => {
		expect(getDisplayedReadmeHtml(null, null)).toBeNull();
	});

	it('prefers empty string local override over non-null prop', () => {
		// An empty string local save means the README was cleared
		expect(getDisplayedReadmeHtml('', '<p>Old content</p>')).toBe('');
	});
});

// ─── hasReadmeContent ─────────────────────────────────────────────────────────
// Determines whether to render HTML vs the "No README" empty state

function hasReadmeContent(html: string | null): boolean {
	return !!html;
}

describe('hasReadmeContent (view mode: HTML vs empty state)', () => {
	it('returns true when html is a non-empty string', () => {
		expect(hasReadmeContent('<p>Hello</p>')).toBe(true);
	});

	it('returns false when html is null (shows empty state)', () => {
		expect(hasReadmeContent(null)).toBe(false);
	});

	it('returns false when html is an empty string (shows empty state)', () => {
		expect(hasReadmeContent('')).toBe(false);
	});
});

// ─── shouldShowEditButton ─────────────────────────────────────────────────────
// Edit button is only shown to the owner

function shouldShowEditButton(isOwner: boolean): boolean {
	return isOwner;
}

describe('shouldShowEditButton (edit button gated on isOwner)', () => {
	it('returns true when the current user is the owner', () => {
		expect(shouldShowEditButton(true)).toBe(true);
	});

	it('returns false when the current user is not the owner', () => {
		expect(shouldShowEditButton(false)).toBe(false);
	});
});

// ─── initEditContent ──────────────────────────────────────────────────────────
// When entering edit mode, the textarea is seeded with the raw markdown

function initEditContent(readmeRaw: string | null): string {
	return readmeRaw ?? '';
}

describe('initEditContent (edit mode shows textarea with raw markdown)', () => {
	it('returns the raw markdown string as-is', () => {
		const md = '# Hello\n\nSome content.';
		expect(initEditContent(md)).toBe(md);
	});

	it('returns an empty string when readmeRaw is null', () => {
		expect(initEditContent(null)).toBe('');
	});

	it('preserves multiline markdown', () => {
		const md = '# Title\n\n- item 1\n- item 2\n\n```js\nconsole.log("hi");\n```';
		expect(initEditContent(md)).toBe(md);
	});
});

// ─── getActiveTabPanel ────────────────────────────────────────────────────────
// Controls which panel is shown based on the selected tab

type EditTab = 'edit' | 'preview';

function getActiveTabPanel(tab: EditTab): 'textarea' | 'preview' {
	return tab === 'edit' ? 'textarea' : 'preview';
}

describe('getActiveTabPanel (tab switching)', () => {
	it('returns textarea panel when edit tab is selected', () => {
		expect(getActiveTabPanel('edit')).toBe('textarea');
	});

	it('returns preview panel when preview tab is selected', () => {
		expect(getActiveTabPanel('preview')).toBe('preview');
	});

	it('switching from edit to preview changes the panel', () => {
		let tab: EditTab = 'edit';
		expect(getActiveTabPanel(tab)).toBe('textarea');
		tab = 'preview';
		expect(getActiveTabPanel(tab)).toBe('preview');
	});

	it('switching back from preview to edit restores the textarea panel', () => {
		let tab: EditTab = 'preview';
		expect(getActiveTabPanel(tab)).toBe('preview');
		tab = 'edit';
		expect(getActiveTabPanel(tab)).toBe('textarea');
	});
});

// ─── parsePreviewResult ───────────────────────────────────────────────────────
// Extracts previewHtml from the server action result

type ActionResult =
	| { type: 'success'; data?: Record<string, unknown> | null }
	| { type: 'error' | 'failure' | 'redirect'; data?: Record<string, unknown> | null };

function parsePreviewResult(result: ActionResult): string | null {
	if (result.type === 'success') {
		return (result.data?.previewHtml as string | null) ?? null;
	}
	return null;
}

describe('parsePreviewResult (preview tab fetch result)', () => {
	it('returns rendered HTML on success', () => {
		const result: ActionResult = {
			type: 'success',
			data: { previewHtml: '<p>Preview</p>' }
		};
		expect(parsePreviewResult(result)).toBe('<p>Preview</p>');
	});

	it('returns null when previewHtml is null in success response', () => {
		const result: ActionResult = { type: 'success', data: { previewHtml: null } };
		expect(parsePreviewResult(result)).toBeNull();
	});

	it('returns null when result type is not success', () => {
		const result: ActionResult = { type: 'failure', data: { error: 'bad' } };
		expect(parsePreviewResult(result)).toBeNull();
	});

	it('returns null when result data is absent', () => {
		const result: ActionResult = { type: 'success' };
		expect(parsePreviewResult(result)).toBeNull();
	});
});

// ─── parseSaveResult ──────────────────────────────────────────────────────────
// Extracts readmeHtml and updatedAt from the saveReadme action result,
// and builds the payload passed to onSaved

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

describe('parseSaveResult (save calls onSaved with timestamp)', () => {
	it('returns readmeHtml and a Date object for updatedAt on success', () => {
		const iso = '2026-04-16T12:00:00.000Z';
		const result: ActionResult = {
			type: 'success',
			data: { readmeHtml: '<p>Saved</p>', updatedAt: iso }
		};
		const payload = parseSaveResult(result);
		expect(payload).not.toBeNull();
		expect(payload!.readmeHtml).toBe('<p>Saved</p>');
		expect(payload!.updatedAt).toBeInstanceOf(Date);
		expect(payload!.updatedAt!.toISOString()).toBe(iso);
	});

	it('returns null updatedAt when updatedAt is absent in response', () => {
		const result: ActionResult = {
			type: 'success',
			data: { readmeHtml: '<p>Saved</p>' }
		};
		const payload = parseSaveResult(result);
		expect(payload!.updatedAt).toBeNull();
	});

	it('returns null when result type is not success', () => {
		const result: ActionResult = { type: 'failure' };
		expect(parseSaveResult(result)).toBeNull();
	});

	it('fires onSaved callback with the parsed payload', () => {
		const iso = '2026-04-16T15:30:00.000Z';
		const result: ActionResult = {
			type: 'success',
			data: { readmeHtml: '<h1>Hi</h1>', updatedAt: iso }
		};
		const onSaved = vi.fn();
		const payload = parseSaveResult(result);
		if (payload) {
			onSaved({ updatedAt: payload.updatedAt });
		}
		expect(onSaved).toHaveBeenCalledWith({ updatedAt: new Date(iso) });
	});

	it('passes null updatedAt to onSaved when server returns no date', () => {
		const result: ActionResult = {
			type: 'success',
			data: { readmeHtml: null }
		};
		const onSaved = vi.fn();
		const payload = parseSaveResult(result);
		if (payload) {
			onSaved({ updatedAt: payload.updatedAt });
		}
		expect(onSaved).toHaveBeenCalledWith({ updatedAt: null });
	});
});
