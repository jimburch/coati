import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetByOwnerSlug = vi.fn();
const mockGetSlugRedirect = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockDeleteSetupForce = vi.fn();
const mockRequireApiAuth = vi.fn();

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getByOwnerSlug: (...args: unknown[]) => mockGetByOwnerSlug(...args),
		getSlugRedirect: (...args: unknown[]) => mockGetSlugRedirect(...args),
		update: (...args: unknown[]) => mockUpdate(...args),
		remove: (...args: unknown[]) => mockRemove(...args)
	}
}));

vi.mock('$lib/server/queries/teams', () => ({
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args)
}));

vi.mock('$lib/server/queries/setups', () => ({
	deleteSetupForce: (...args: unknown[]) => mockDeleteSetupForce(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: (...args: unknown[]) => mockRequireApiAuth(...args)
}));

const MOCK_SETUP = {
	id: 'setup-uuid-1',
	userId: 'user-uuid-1',
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A great setup',
	readme: null,
	category: null,
	license: null,
	minToolVersion: null,
	postInstall: null,
	prerequisites: null,
	starsCount: 0,
	clonesCount: 0,
	commentsCount: 0,
	featuredAt: null,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	ownerUsername: 'alice',
	ownerAvatarUrl: null
};

function makeGetEvent(owner: string, slug: string) {
	return {
		params: { owner, slug },
		locals: { user: null },
		request: new Request(`http://localhost/api/v1/setups/${owner}/${slug}`)
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/setups/[owner]/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with setup when found by slug', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.slug).toBe('my-setup');
	});

	it('GET response does not include placement field', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		const body = await res.json();
		expect(body.data).not.toHaveProperty('placement');
	});

	it('returns 301 redirect to current slug when old slug found in redirects', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue('renamed-setup');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'old-slug'));
		expect(res.status).toBe(301);
		expect(res.headers.get('Location')).toBe('/api/v1/setups/alice/renamed-setup');
	});

	it('returns 404 when slug not found in setups or redirects', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'nonexistent'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('redirect Location points directly to current slug (no chains)', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue('current-slug');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'first-old-slug'));
		expect(res.status).toBe(301);
		expect(res.headers.get('Location')).toBe('/api/v1/setups/alice/current-slug');
	});
});

function makePatchEvent(
	owner: string,
	slug: string,
	userId: string,
	body: Record<string, unknown> = {}
) {
	mockRequireApiAuth.mockReturnValue({ id: userId, username: 'testuser' });
	return {
		params: { owner, slug },
		locals: { user: { id: userId } },
		request: new Request(`http://localhost/api/v1/setups/${owner}/${slug}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as Parameters<(typeof import('./+server'))['PATCH']>[0];
}

function makeDeleteEvent(owner: string, slug: string, userId: string) {
	mockRequireApiAuth.mockReturnValue({ id: userId, username: 'testuser' });
	return {
		params: { owner, slug },
		locals: { user: { id: userId } },
		request: new Request(`http://localhost/api/v1/setups/${owner}/${slug}`, { method: 'DELETE' })
	} as Parameters<(typeof import('./+server'))['DELETE']>[0];
}

const PERSONAL_SETUP = {
	...MOCK_SETUP,
	teamId: null,
	visibility: 'public' as const
};

const TEAM_SETUP = {
	...MOCK_SETUP,
	userId: 'member-user-id',
	teamId: 'team-uuid-1',
	visibility: 'private' as const
};

describe('PATCH /api/v1/setups/[owner]/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when setup not found', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('alice', 'my-setup', 'user-uuid-1'));
		expect(res.status).toBe(404);
	});

	it('allows setup owner to edit their setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(PERSONAL_SETUP);
		mockUpdate.mockResolvedValue({ ...PERSONAL_SETUP, name: 'Updated' });
		const { PATCH } = await import('./+server');
		const res = await PATCH(
			makePatchEvent('alice', 'my-setup', 'user-uuid-1', { name: 'Updated' })
		);
		expect(res.status).toBe(200);
	});

	it('returns 403 when non-owner tries to edit personal setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(PERSONAL_SETUP);
		mockGetTeamMemberRole.mockResolvedValue(null);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('alice', 'my-setup', 'other-user-id'));
		expect(res.status).toBe(403);
	});

	it('allows team admin to edit any team setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(TEAM_SETUP);
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockUpdate.mockResolvedValue({ ...TEAM_SETUP, name: 'Updated' });
		const { PATCH } = await import('./+server');
		const res = await PATCH(
			makePatchEvent('alice', 'my-setup', 'admin-user-id', { name: 'Updated' })
		);
		expect(res.status).toBe(200);
	});

	it('returns 403 when team member tries to edit another member setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(TEAM_SETUP);
		mockGetTeamMemberRole.mockResolvedValue('member');
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('alice', 'my-setup', 'different-member-id'));
		expect(res.status).toBe(403);
	});

	it('allows team member to edit their own team setup', async () => {
		const ownSetup = { ...TEAM_SETUP, userId: 'member-user-id' };
		mockGetByOwnerSlug.mockResolvedValue(ownSetup);
		mockUpdate.mockResolvedValue({ ...ownSetup, name: 'Updated' });
		const { PATCH } = await import('./+server');
		const res = await PATCH(
			makePatchEvent('alice', 'my-setup', 'member-user-id', { name: 'Updated' })
		);
		expect(res.status).toBe(200);
	});
});

describe('DELETE /api/v1/setups/[owner]/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when setup not found', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('alice', 'my-setup', 'user-uuid-1'));
		expect(res.status).toBe(404);
	});

	it('allows setup owner to delete their setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(PERSONAL_SETUP);
		mockRemove.mockResolvedValue(1);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('alice', 'my-setup', 'user-uuid-1'));
		expect(res.status).toBe(200);
	});

	it('returns 403 when non-owner tries to delete personal setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(PERSONAL_SETUP);
		mockGetTeamMemberRole.mockResolvedValue(null);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('alice', 'my-setup', 'other-user-id'));
		expect(res.status).toBe(403);
	});

	it('allows team admin to delete any team setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(TEAM_SETUP);
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockDeleteSetupForce.mockResolvedValue(1);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('alice', 'my-setup', 'admin-user-id'));
		expect(res.status).toBe(200);
	});

	it('returns 403 when team member tries to delete another member setup', async () => {
		mockGetByOwnerSlug.mockResolvedValue(TEAM_SETUP);
		mockGetTeamMemberRole.mockResolvedValue('member');
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('alice', 'my-setup', 'different-member-id'));
		expect(res.status).toBe(403);
	});

	it('team admin delete calls deleteSetupForce with setup owner id', async () => {
		const teamSetupWithOwner = { ...TEAM_SETUP, userId: 'member-user-id' };
		mockGetByOwnerSlug.mockResolvedValue(teamSetupWithOwner);
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockDeleteSetupForce.mockResolvedValue(1);
		const { DELETE } = await import('./+server');
		await DELETE(makeDeleteEvent('alice', 'my-setup', 'admin-user-id'));
		expect(mockDeleteSetupForce).toHaveBeenCalledWith('setup-uuid-1', 'member-user-id');
	});
});
