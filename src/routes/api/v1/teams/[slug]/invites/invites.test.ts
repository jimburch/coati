import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamBySlugForAuth = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockCreateInviteLink = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamBySlugForAuth: (...args: unknown[]) => mockGetTeamBySlugForAuth(...args),
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args),
	createInviteLink: (...args: unknown[]) => mockCreateInviteLink(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireBetaFeatures: vi.fn()
}));

const TEAM = { id: 'team-1', name: 'My Team', slug: 'my-team', ownerId: 'owner-1' };
const OWNER = { id: 'owner-1', hasBetaFeatures: true };
const ADMIN = { id: 'admin-1', hasBetaFeatures: true };

function makePostEvent(slug: string, origin = 'http://localhost') {
	return {
		params: { slug },
		request: new Request(`${origin}/api/v1/teams/${slug}/invites`, {
			method: 'POST'
		}),
		url: new URL(`${origin}/api/v1/teams/${slug}/invites`),
		locals: {}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/teams/[slug]/invites', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 401 when not authenticated', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401
			})
		);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team'));
		expect(res.status).toBe(401);
	});

	it('returns 404 when team not found', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(null);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('missing-team'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when caller is a regular member (not owner or admin)', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue({
			id: 'member-1',
			hasBetaFeatures: true
		} as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue('member');

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team'));
		expect(res.status).toBe(403);
	});

	it('returns 201 with invite URL when owner generates link', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteLink.mockResolvedValue({ ok: true, token: 'abc123' });

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', 'http://localhost:5173'));
		expect(res.status).toBe(201);
		const json = await res.json();
		expect(json.data.inviteUrl).toContain('/invite/abc123');
		expect(json.data.token).toBe('abc123');
	});

	it('returns 201 with invite URL when admin generates link', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(ADMIN as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockCreateInviteLink.mockResolvedValue({ ok: true, token: 'xyz789' });

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', 'http://localhost:5173'));
		expect(res.status).toBe(201);
		const json = await res.json();
		expect(json.data.token).toBe('xyz789');
	});

	it('calls createInviteLink with teamId and userId', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteLink.mockResolvedValue({ ok: true, token: 'tok' });

		const { POST } = await import('./+server');
		await POST(makePostEvent('my-team'));
		expect(mockCreateInviteLink).toHaveBeenCalledWith('team-1', 'owner-1');
	});
});
