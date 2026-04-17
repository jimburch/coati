import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamBySlugForAuth = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockGetTeamSetupDetail = vi.fn();
const mockUpdateSetup = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamBySlugForAuth: (...args: unknown[]) => mockGetTeamBySlugForAuth(...args),
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args)
}));

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getTeamSetupDetail: (...args: unknown[]) => mockGetTeamSetupDetail(...args)
	}
}));

vi.mock('$lib/server/queries/setups', () => ({
	updateSetup: (...args: unknown[]) => mockUpdateSetup(...args)
}));

const OWNER = { id: 'owner-id', username: 'alice' };
const ADMIN_USER = { id: 'admin-id', username: 'bob' };
const MEMBER_USER = { id: 'member-id', username: 'carol' };
const TEAM = { id: 'team-1', name: 'My Team', slug: 'my-team', ownerId: 'owner-id' };
const SETUP = {
	id: 'setup-1',
	slug: 'my-setup',
	name: 'My Setup',
	display: null,
	description: 'A setup',
	visibility: 'private' as const,
	teamId: 'team-1',
	userId: 'owner-id',
	starsCount: 0,
	clonesCount: 0,
	commentsCount: 0,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	featuredAt: null,
	readme: null,
	category: null,
	license: null,
	minToolVersion: null,
	postInstall: null,
	prerequisites: null,
	ownerUsername: 'alice',
	ownerAvatarUrl: null,
	teamName: 'My Team',
	teamSlug: 'my-team',
	teamAvatarUrl: null,
	files: [],
	tags: [],
	agents: [],
	isStarred: false
};

function makeActionEvent(
	teamSlug: string,
	setupSlug: string,
	user: { id: string; username: string } | null,
	body: Record<string, string>
) {
	const formData = new FormData();
	for (const [k, v] of Object.entries(body)) formData.append(k, v);
	return {
		params: { teamSlug, setupSlug },
		locals: { user },
		request: { formData: () => Promise.resolve(formData) }
	} as Parameters<(typeof import('./+page.server'))['actions']['setVisibility']>[0];
}

describe('team setup settings setVisibility action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamSetupDetail.mockResolvedValue(SETUP);
		mockUpdateSetup.mockResolvedValue(SETUP);
	});

	it('allows team owner to set visibility to public', async () => {
		mockGetTeamMemberRole.mockResolvedValue('admin');
		const { actions } = await import('./+page.server');
		const result = await actions.setVisibility(
			makeActionEvent('my-team', 'my-setup', OWNER, { visibility: 'public' })
		);
		expect(mockUpdateSetup).toHaveBeenCalledWith('setup-1', { visibility: 'public' });
		expect(result).toEqual({ visibility: 'public' });
	});

	it('allows team admin to set visibility to private', async () => {
		mockGetTeamMemberRole.mockResolvedValue('admin');
		const { actions } = await import('./+page.server');
		const result = await actions.setVisibility(
			makeActionEvent('my-team', 'my-setup', ADMIN_USER, { visibility: 'private' })
		);
		expect(mockUpdateSetup).toHaveBeenCalledWith('setup-1', { visibility: 'private' });
		expect(result).toEqual({ visibility: 'private' });
	});

	it('blocks team member from changing visibility', async () => {
		mockGetTeamMemberRole.mockResolvedValue('member');
		const { actions } = await import('./+page.server');
		const result = await actions.setVisibility(
			makeActionEvent('my-team', 'my-setup', MEMBER_USER, { visibility: 'public' })
		);
		expect(mockUpdateSetup).not.toHaveBeenCalled();
		expect(result).toMatchObject({ status: 403 });
	});

	it('returns 400 for invalid visibility value', async () => {
		mockGetTeamMemberRole.mockResolvedValue('admin');
		const { actions } = await import('./+page.server');
		const result = await actions.setVisibility(
			makeActionEvent('my-team', 'my-setup', OWNER, { visibility: 'protected' })
		);
		expect(mockUpdateSetup).not.toHaveBeenCalled();
		expect(result).toMatchObject({ status: 400 });
	});

	it('treats team owner (ownerId match) as admin even with member role', async () => {
		mockGetTeamMemberRole.mockResolvedValue('member');
		const { actions } = await import('./+page.server');
		const result = await actions.setVisibility(
			makeActionEvent('my-team', 'my-setup', OWNER, { visibility: 'public' })
		);
		expect(mockUpdateSetup).toHaveBeenCalledWith('setup-1', { visibility: 'public' });
		expect(result).toEqual({ visibility: 'public' });
	});
});
