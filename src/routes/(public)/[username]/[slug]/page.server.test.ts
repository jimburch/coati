import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDetail = vi.fn();
const mockUpdate = vi.fn();
const mockGetSlugRedirect = vi.fn();
const mockRenderMarkdown = vi.fn();

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getDetail: (...args: unknown[]) => mockGetDetail(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		getSlugRedirect: (...args: unknown[]) => mockGetSlugRedirect(...args)
	}
}));

const mockSetFeatured = vi.fn();
const mockGetSetupByOwnerSlug = vi.fn();
const mockDeleteSetup = vi.fn();
const mockSetStar = vi.fn();
const mockIsSetupStarredByUser = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	setStar: (...args: unknown[]) => mockSetStar(...args),
	getSetupByOwnerSlug: (...args: unknown[]) => mockGetSetupByOwnerSlug(...args),
	isSetupStarredByUser: (...args: unknown[]) => mockIsSetupStarredByUser(...args),
	setFeatured: (...args: unknown[]) => mockSetFeatured(...args),
	deleteSetup: (...args: unknown[]) => mockDeleteSetup(...args)
}));

const mockCreateComment = vi.fn();
const mockDeleteComment = vi.fn();

class InvalidParentError extends Error {}
class ForbiddenError extends Error {}

vi.mock('$lib/server/queries/comments', () => ({
	createComment: (...args: unknown[]) => mockCreateComment(...args),
	deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
	InvalidParentError,
	ForbiddenError
}));

const mockCreateReport = vi.fn();

vi.mock('$lib/server/queries/reports', () => ({
	createReport: (...args: unknown[]) => mockCreateReport(...args)
}));

vi.mock('$lib/server/markdown', () => ({
	renderMarkdown: (...args: unknown[]) => mockRenderMarkdown(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_SETUP = {
	id: 'setup-id',
	name: 'Test Setup',
	slug: 'test-setup',
	userId: 'owner-id',
	ownerUsername: 'alice',
	readme: '# Hello\nworld',
	updatedAt: new Date('2026-01-01T00:00:00Z'),
	tags: [],
	agents: [],
	files: [],
	isStarred: false
};

function makeActionEvent(
	formData: Record<string, string>,
	params: { username: string; slug: string },
	user: { id: string; username: string; isAdmin?: boolean } | null
) {
	const fd = new FormData();
	for (const [key, value] of Object.entries(formData)) {
		fd.append(key, value);
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { params, request: { formData: () => Promise.resolve(fd) }, locals: { user } } as any;
}

describe('saveReadme action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '# New README' },
			{ username: 'alice', slug: 'test-setup' },
			null
		);

		await expect(actions.saveReadme(event)).rejects.toMatchObject({ status: 302 });
	});

	it('returns 404 when setup not found', async () => {
		mockGetDetail.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '# New README' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		await expect(actions.saveReadme(event)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when user is not the owner', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '# New README' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'other-user-id', username: 'bob' }
		);

		const result = await actions.saveReadme(event);
		expect(result).toMatchObject({ status: 403 });
	});

	it('updates readme and returns rendered HTML', async () => {
		const updatedSetup = {
			...MOCK_SETUP,
			readme: '# New README',
			updatedAt: new Date('2026-03-30')
		};
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		mockUpdate.mockResolvedValue(updatedSetup);
		mockRenderMarkdown.mockResolvedValue('<h1>New README</h1>');

		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '# New README' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		const result = await actions.saveReadme(event);
		expect(mockUpdate).toHaveBeenCalledWith('setup-id', { readme: '# New README' });
		expect(mockRenderMarkdown).toHaveBeenCalledWith('# New README');
		expect(result).toMatchObject({
			readmeHtml: '<h1>New README</h1>',
			updatedAt: updatedSetup.updatedAt
		});
	});

	it('deletes the readme (persists null) when body is empty', async () => {
		const updatedSetup = { ...MOCK_SETUP, readme: null, updatedAt: new Date('2026-03-30') };
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		mockUpdate.mockResolvedValue(updatedSetup);

		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		const result = await actions.saveReadme(event);
		expect(mockUpdate).toHaveBeenCalledWith('setup-id', { readme: null });
		expect(result).toMatchObject({ readmeHtml: null });
	});

	it('deletes the readme (persists null) when body is whitespace-only', async () => {
		const updatedSetup = { ...MOCK_SETUP, readme: null, updatedAt: new Date('2026-03-30') };
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		mockUpdate.mockResolvedValue(updatedSetup);

		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '   \n\t  ' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		const result = await actions.saveReadme(event);
		expect(mockUpdate).toHaveBeenCalledWith('setup-id', { readme: null });
		expect(result).toMatchObject({ readmeHtml: null });
	});
});

describe('feature action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent({}, { username: 'alice', slug: 'test-setup' }, null);
		await expect(actions.feature(event)).rejects.toMatchObject({ status: 302 });
	});

	it('returns 403 when user is not admin', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'user-id', username: 'bob', isAdmin: false }
		);
		const result = await actions.feature(event);
		expect(result).toMatchObject({ status: 403 });
	});

	it('returns 404 when setup not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'admin-id', username: 'admin', isAdmin: true }
		);
		await expect(actions.feature(event)).rejects.toMatchObject({ status: 404 });
	});

	it('features a setup when featuredAt is null', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue({ ...MOCK_SETUP, featuredAt: null });
		mockSetFeatured.mockResolvedValue(undefined);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'admin-id', username: 'admin', isAdmin: true }
		);
		const result = await actions.feature(event);
		expect(mockSetFeatured).toHaveBeenCalledWith('setup-id', true);
		expect(result).toMatchObject({ featured: true });
	});

	it('unfeatures a setup when featuredAt is set', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue({
			...MOCK_SETUP,
			featuredAt: new Date('2026-01-01')
		});
		mockSetFeatured.mockResolvedValue(undefined);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'admin-id', username: 'admin', isAdmin: true }
		);
		const result = await actions.feature(event);
		expect(mockSetFeatured).toHaveBeenCalledWith('setup-id', false);
		expect(result).toMatchObject({ featured: false });
	});
});

describe('delete action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent({}, { username: 'alice', slug: 'test-setup' }, null);
		await expect(actions.delete(event)).rejects.toMatchObject({ status: 302 });
	});

	it('returns 404 when setup not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ slug: 'test-setup' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		await expect(actions.delete(event)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when user does not own the setup', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ slug: 'test-setup' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'other-user-id', username: 'bob' }
		);
		const result = await actions.delete(event);
		expect(result).toMatchObject({ status: 403 });
	});

	it('returns 400 when slug confirmation does not match', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ slug: 'wrong-slug' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		const result = await actions.delete(event);
		expect(result).toMatchObject({ status: 400 });
	});

	it('deletes setup and redirects to profile with deleted query param', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockDeleteSetup.mockResolvedValue(1);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ slug: 'test-setup' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		await expect(actions.delete(event)).rejects.toMatchObject({
			status: 303,
			location: '/alice?deleted=Test%20Setup'
		});
		expect(mockDeleteSetup).toHaveBeenCalledWith('setup-id', 'owner-id');
	});
});

describe('previewReadme action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('renders markdown and returns HTML', async () => {
		mockRenderMarkdown.mockResolvedValue('<h1>Preview</h1>');
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '# Preview' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		const result = await actions.previewReadme(event);
		expect(mockRenderMarkdown).toHaveBeenCalledWith('# Preview');
		expect(result).toMatchObject({ previewHtml: '<h1>Preview</h1>' });
	});

	it('returns null previewHtml for empty markdown', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		const result = await actions.previewReadme(event);
		expect(mockRenderMarkdown).not.toHaveBeenCalled();
		expect(result).toMatchObject({ previewHtml: null });
	});
});

function makeLoadEvent(
	params: { username: string; slug: string },
	user: { id: string; username: string } | null
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { params, locals: { user } } as any;
}

describe('load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to the canonical slug when the setup has been renamed', async () => {
		mockGetDetail.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue('new-slug');
		const { load } = await import('./+page.server');
		await expect(
			load(makeLoadEvent({ username: 'alice', slug: 'old-slug' }, null))
		).rejects.toMatchObject({
			status: 301,
			location: '/alice/new-slug'
		});
	});

	it('throws 404 when setup not found and no slug redirect', async () => {
		mockGetDetail.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue(null);
		const { load } = await import('./+page.server');
		await expect(
			load(makeLoadEvent({ username: 'alice', slug: 'missing' }, null))
		).rejects.toMatchObject({
			status: 404
		});
	});

	it('returns setup, rendered readme, and user on the happy path', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		mockRenderMarkdown.mockResolvedValue('<h1>Hello</h1>');
		const { load } = await import('./+page.server');
		const result = (await load(
			makeLoadEvent(
				{ username: 'alice', slug: 'test-setup' },
				{ id: 'owner-id', username: 'alice' }
			)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		)) as any;
		expect(mockGetDetail).toHaveBeenCalledWith('alice', 'test-setup', 'owner-id');
		expect(result.readmeHtml).toBe('<h1>Hello</h1>');
		expect(result.setup).toBe(MOCK_SETUP);
		expect(result.user).toMatchObject({ id: 'owner-id' });
	});

	it('returns null readmeHtml when setup has no readme', async () => {
		mockGetDetail.mockResolvedValue({ ...MOCK_SETUP, readme: null });
		const { load } = await import('./+page.server');
		const result = (await load(
			makeLoadEvent({ username: 'alice', slug: 'test-setup' }, null)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		)) as any;
		expect(mockRenderMarkdown).not.toHaveBeenCalled();
		expect(result.readmeHtml).toBeNull();
		expect(result.user).toBeNull();
	});
});

describe('saveAbout action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: 'New', description: '' },
			{ username: 'alice', slug: 'test-setup' },
			null
		);
		await expect(actions.saveAbout(event)).rejects.toMatchObject({ status: 302 });
	});

	it('returns 404 when setup not found', async () => {
		mockGetDetail.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: 'New', description: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		await expect(actions.saveAbout(event)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 403 when user does not own the setup', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: 'New', description: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'other', username: 'bob' }
		);
		const result = await actions.saveAbout(event);
		expect(result).toMatchObject({ status: 403 });
	});

	it('returns 400 when display is blank after trimming', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: '   ', description: 'anything' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		const result = await actions.saveAbout(event);
		expect(result).toMatchObject({ status: 400, data: { code: 'INVALID_DISPLAY' } });
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('returns 400 when display exceeds 150 chars', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: 'x'.repeat(151), description: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		const result = await actions.saveAbout(event);
		expect(result).toMatchObject({ status: 400, data: { code: 'INVALID_DISPLAY' } });
	});

	it('returns 400 when description exceeds 300 chars', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: 'ok', description: 'x'.repeat(301) },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		const result = await actions.saveAbout(event);
		expect(result).toMatchObject({ status: 400, data: { code: 'INVALID_DESCRIPTION' } });
	});

	it('updates display and description and returns them trimmed', async () => {
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		mockUpdate.mockResolvedValue({ ...MOCK_SETUP, display: 'My Setup', description: 'A nice one' });
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ display: '  My Setup  ', description: '  A nice one  ' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);
		const result = await actions.saveAbout(event);
		expect(mockUpdate).toHaveBeenCalledWith('setup-id', {
			display: 'My Setup',
			description: 'A nice one'
		});
		expect(result).toMatchObject({ display: 'My Setup', description: 'A nice one' });
	});
});

describe('star action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent({}, { username: 'alice', slug: 'test-setup' }, null);
		await expect(actions.star(event)).rejects.toMatchObject({ status: 302 });
	});

	it('throws 404 when setup not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'user-1', username: 'bob' }
		);
		await expect(actions.star(event)).rejects.toMatchObject({ status: 404 });
	});

	it('refuses to star a private setup', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue({ ...MOCK_SETUP, visibility: 'private' });
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'user-1', username: 'bob' }
		);
		const result = await actions.star(event);
		expect(result).toMatchObject({ status: 403, data: { code: 'FORBIDDEN' } });
		expect(mockSetStar).not.toHaveBeenCalled();
	});

	it('toggles star on when currently unstarred', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue({ ...MOCK_SETUP, visibility: 'public' });
		mockIsSetupStarredByUser.mockResolvedValue(false);
		mockSetStar.mockResolvedValue({ starred: true, starsCount: 5 });
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'user-1', username: 'bob' }
		);
		const result = await actions.star(event);
		expect(mockSetStar).toHaveBeenCalledWith('user-1', 'setup-id', true);
		expect(result).toMatchObject({ isStarred: true, starsCount: 5 });
	});

	it('toggles star off when currently starred', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue({ ...MOCK_SETUP, visibility: 'public' });
		mockIsSetupStarredByUser.mockResolvedValue(true);
		mockSetStar.mockResolvedValue({ starred: false, starsCount: 4 });
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'user-1', username: 'bob' }
		);
		const result = await actions.star(event);
		expect(mockSetStar).toHaveBeenCalledWith('user-1', 'setup-id', false);
		expect(result).toMatchObject({ isStarred: false, starsCount: 4 });
	});
});

describe('comment action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent({ body: 'hi' }, { username: 'alice', slug: 'test-setup' }, null);
		await expect(actions.comment(event)).rejects.toMatchObject({ status: 302 });
	});

	it('throws 404 when setup not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ body: 'hi' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		await expect(actions.comment(event)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 400 when body is empty (schema rejects)', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ body: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.comment(event);
		expect(result).toMatchObject({ status: 400 });
		expect(mockCreateComment).not.toHaveBeenCalled();
	});

	it('returns INVALID_PARENT when createComment throws InvalidParentError', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateComment.mockRejectedValue(new InvalidParentError('no nested replies'));
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ body: 'reply' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.comment(event);
		expect(result).toMatchObject({ status: 400, data: { code: 'INVALID_PARENT' } });
	});

	it('re-throws unexpected errors from createComment', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateComment.mockRejectedValue(new Error('db down'));
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ body: 'hello' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		await expect(actions.comment(event)).rejects.toThrow('db down');
	});

	it('creates a comment and returns success', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateComment.mockResolvedValue(undefined);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ body: 'hello world' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.comment(event);
		expect(mockCreateComment).toHaveBeenCalledWith('setup-id', 'u', 'hello world', undefined);
		expect(result).toMatchObject({ success: true });
	});
});

describe('deleteComment action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ commentId: 'c-1' },
			{ username: 'alice', slug: 'test-setup' },
			null
		);
		await expect(actions.deleteComment(event)).rejects.toMatchObject({ status: 302 });
	});

	it('returns 400 when commentId is missing', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{},
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.deleteComment(event);
		expect(result).toMatchObject({ status: 400, data: { code: 'BAD_REQUEST' } });
	});

	it('returns 403 when deleteComment throws ForbiddenError', async () => {
		mockDeleteComment.mockRejectedValue(new ForbiddenError('not your comment'));
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ commentId: 'c-1' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.deleteComment(event);
		expect(result).toMatchObject({ status: 403, data: { code: 'FORBIDDEN' } });
	});

	it('re-throws unexpected errors', async () => {
		mockDeleteComment.mockRejectedValue(new Error('db blew up'));
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ commentId: 'c-1' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		await expect(actions.deleteComment(event)).rejects.toThrow('db blew up');
	});

	it('deletes the comment on success', async () => {
		mockDeleteComment.mockResolvedValue(undefined);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ commentId: 'c-1' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.deleteComment(event);
		expect(mockDeleteComment).toHaveBeenCalledWith('c-1', 'u');
		expect(result).toMatchObject({ success: true });
	});
});

describe('report action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('redirects to login when not authenticated', async () => {
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ reason: 'spam' },
			{ username: 'alice', slug: 'test-setup' },
			null
		);
		await expect(actions.report(event)).rejects.toMatchObject({ status: 302 });
	});

	it('throws 404 when setup not found', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(null);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ reason: 'spam' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		await expect(actions.report(event)).rejects.toMatchObject({ status: 404 });
	});

	it('returns 400 when reason is not in the allowed enum', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ reason: 'not-a-real-reason' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.report(event);
		expect(result).toMatchObject({ status: 400 });
		expect(mockCreateReport).not.toHaveBeenCalled();
	});

	it('returns 409 DUPLICATE_REPORT on unique-violation errors from the DB', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const dbError = Object.assign(new Error('duplicate key'), { code: '23505' });
		mockCreateReport.mockRejectedValue(dbError);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ reason: 'spam' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.report(event);
		expect(result).toMatchObject({ status: 409, data: { code: 'DUPLICATE_REPORT' } });
	});

	it('re-throws non-unique-violation errors', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateReport.mockRejectedValue(new Error('boom'));
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ reason: 'spam' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		await expect(actions.report(event)).rejects.toThrow('boom');
	});

	it('creates a report and returns reportSuccess', async () => {
		mockGetSetupByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateReport.mockResolvedValue(undefined);
		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ reason: 'malicious', description: 'exfils secrets' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'u', username: 'bob' }
		);
		const result = await actions.report(event);
		expect(mockCreateReport).toHaveBeenCalledWith('setup-id', 'u', 'malicious', 'exfils secrets');
		expect(result).toMatchObject({ reportSuccess: true });
	});
});
