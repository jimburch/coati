import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDetail = vi.fn();
const mockUpdate = vi.fn();
const mockRenderMarkdown = vi.fn();

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getDetail: (...args: unknown[]) => mockGetDetail(...args),
		update: (...args: unknown[]) => mockUpdate(...args)
	}
}));

vi.mock('$lib/server/queries/setups', () => ({
	setStar: vi.fn(),
	getSetupByOwnerSlug: vi.fn(),
	isSetupStarredByUser: vi.fn()
}));

vi.mock('$lib/server/queries/comments', () => ({
	createComment: vi.fn(),
	deleteComment: vi.fn(),
	InvalidParentError: class InvalidParentError extends Error {},
	ForbiddenError: class ForbiddenError extends Error {}
}));

vi.mock('$lib/server/queries/reports', () => ({
	createReport: vi.fn()
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
	user: { id: string; username: string } | null
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

	it('handles empty readme gracefully', async () => {
		const updatedSetup = { ...MOCK_SETUP, readme: '', updatedAt: new Date('2026-03-30') };
		mockGetDetail.mockResolvedValue(MOCK_SETUP);
		mockUpdate.mockResolvedValue(updatedSetup);

		const { actions } = await import('./+page.server');
		const event = makeActionEvent(
			{ readme: '' },
			{ username: 'alice', slug: 'test-setup' },
			{ id: 'owner-id', username: 'alice' }
		);

		const result = await actions.saveReadme(event);
		expect(mockUpdate).toHaveBeenCalledWith('setup-id', { readme: '' });
		expect(result).toMatchObject({ readmeHtml: null });
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
