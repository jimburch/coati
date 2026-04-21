import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error as errorResponse } from '$lib/server/responses';

const mockGetTeamBySlug = vi.fn();
const mockGetTeamBySlugForAuth = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();
const mockRequireApiAuth = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamBySlug: (...args: unknown[]) => mockGetTeamBySlug(...args),
	getTeamBySlugForAuth: (...args: unknown[]) => mockGetTeamBySlugForAuth(...args),
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args),
	updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
	deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: (...args: unknown[]) => mockRequireApiAuth(...args)
}));

const MOCK_TEAM = {
	id: 'team-1',
	name: 'My Team',
	slug: 'my-team',
	description: 'A team',
	avatarUrl: null,
	ownerId: 'owner-id',
	membersCount: 1,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	setups: []
};

function makeGetEvent(slug: string, userId?: string) {
	return {
		params: { slug },
		locals: { user: userId ? { id: userId } : null },
		request: new Request(`http://localhost/api/v1/teams/${slug}`)
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

function makePatchEvent(slug: string, body: unknown) {
	return {
		params: { slug },
		locals: { user: null },
		request: new Request(`http://localhost/api/v1/teams/${slug}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as Parameters<(typeof import('./+server'))['PATCH']>[0];
}

function makeDeleteEvent(slug: string) {
	return {
		params: { slug },
		locals: { user: null },
		request: new Request(`http://localhost/api/v1/teams/${slug}`, { method: 'DELETE' })
	} as Parameters<(typeof import('./+server'))['DELETE']>[0];
}

describe('GET /api/v1/teams/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with team when found', async () => {
		mockGetTeamBySlug.mockResolvedValue(MOCK_TEAM);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-team'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.slug).toBe('my-team');
	});

	it('returns 404 when team not found', async () => {
		mockGetTeamBySlug.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nonexistent'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('passes viewerId when authenticated', async () => {
		mockGetTeamBySlug.mockResolvedValue(MOCK_TEAM);
		const { GET } = await import('./+server');
		await GET(makeGetEvent('my-team', 'user-1'));
		expect(mockGetTeamBySlug).toHaveBeenCalledWith('my-team', 'user-1');
	});

	it('passes undefined viewerId when not authenticated', async () => {
		mockGetTeamBySlug.mockResolvedValue(MOCK_TEAM);
		const { GET } = await import('./+server');
		await GET(makeGetEvent('my-team'));
		expect(mockGetTeamBySlug).toHaveBeenCalledWith('my-team', undefined);
	});
});

describe('PATCH /api/v1/teams/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		mockRequireApiAuth.mockReturnValue(
			errorResponse('Authentication required', 'UNAUTHORIZED', 401)
		);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('my-team', { name: 'New name' }));
		expect(res.status).toBe(401);
		expect(mockGetTeamBySlugForAuth).not.toHaveBeenCalled();
	});

	it('returns 404 when team not found', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'user-1' });
		mockGetTeamBySlugForAuth.mockResolvedValue(null);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('missing', { name: 'X' }));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns 403 when caller is neither admin nor owner', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'stranger' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		mockGetTeamMemberRole.mockResolvedValue('member');
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('my-team', { name: 'X' }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
		expect(mockUpdateTeam).not.toHaveBeenCalled();
	});

	it('returns 400 when body fails schema validation', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'owner-id' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		mockGetTeamMemberRole.mockResolvedValue(null);
		const { PATCH } = await import('./+server');
		// name too long → fails updateTeamSchema's max(100)
		const res = await PATCH(makePatchEvent('my-team', { name: 'x'.repeat(101) }));
		expect(res.status).toBe(400);
		expect(mockUpdateTeam).not.toHaveBeenCalled();
	});

	it('allows the owner to update even when not a team member', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'owner-id' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockUpdateTeam.mockResolvedValue({ ...MOCK_TEAM, name: 'Renamed' });
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('my-team', { name: 'Renamed' }));
		expect(res.status).toBe(200);
		expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', { name: 'Renamed' });
		const body = await res.json();
		expect(body.data.name).toBe('Renamed');
	});

	it('allows an admin (non-owner) to update', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'admin-user' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockUpdateTeam.mockResolvedValue({ ...MOCK_TEAM, description: 'updated' });
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('my-team', { description: 'updated' }));
		expect(res.status).toBe(200);
		expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', { description: 'updated' });
	});

	it('returns 404 when updateTeam returns null (race)', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'owner-id' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockUpdateTeam.mockResolvedValue(null);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('my-team', { name: 'X' }));
		expect(res.status).toBe(404);
	});
});

describe('DELETE /api/v1/teams/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when unauthenticated', async () => {
		mockRequireApiAuth.mockReturnValue(
			errorResponse('Authentication required', 'UNAUTHORIZED', 401)
		);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('my-team'));
		expect(res.status).toBe(401);
		expect(mockGetTeamBySlugForAuth).not.toHaveBeenCalled();
	});

	it('returns 404 when team not found', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'user-1' });
		mockGetTeamBySlugForAuth.mockResolvedValue(null);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('missing'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when caller is not the owner (even team admins)', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'admin-user' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('my-team'));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
		expect(mockDeleteTeam).not.toHaveBeenCalled();
	});

	it('deletes the team when caller is the owner', async () => {
		mockRequireApiAuth.mockReturnValue({ id: 'owner-id' });
		mockGetTeamBySlugForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner-id' });
		mockDeleteTeam.mockResolvedValue(undefined);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('my-team'));
		expect(res.status).toBe(200);
		expect(mockDeleteTeam).toHaveBeenCalledWith('team-1');
		const body = await res.json();
		expect(body.data.deleted).toBe(true);
	});
});
