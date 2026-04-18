import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamBySlugForAuth = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockGetTeamMembers = vi.fn();
const mockCreateInviteByUsername = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamBySlugForAuth: (...args: unknown[]) => mockGetTeamBySlugForAuth(...args),
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args),
	getTeamMembers: (...args: unknown[]) => mockGetTeamMembers(...args),
	createInviteByUsername: (...args: unknown[]) => mockCreateInviteByUsername(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

const OWNER = { id: 'owner-id', username: 'alice', hasBetaFeatures: true };
const ADMIN = { id: 'admin-id', username: 'bob', hasBetaFeatures: true };
const MEMBER = { id: 'member-id', username: 'carol', hasBetaFeatures: true };
const TEAM = { id: 'team-uuid', name: 'My Team', slug: 'my-team', ownerId: 'owner-id' };

function makeGetEvent(slug: string) {
	return {
		params: { slug },
		request: new Request(`http://localhost/api/v1/teams/${slug}/members`),
		locals: {}
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

function makePostEvent(slug: string, body: unknown) {
	return {
		params: { slug },
		request: new Request(`http://localhost/api/v1/teams/${slug}/members`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: {}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('GET /api/v1/teams/[slug]/members', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockGetTeamMembers.mockResolvedValue([]);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-team'));
		expect(res.status).toBe(401);
	});

	it('returns 404 when team not found', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nonexistent'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when not a member', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(MEMBER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-team'));
		expect(res.status).toBe(403);
	});

	it('returns members list for team member', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(ADMIN as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue('admin');
		mockGetTeamMembers.mockResolvedValue([
			{ userId: 'owner-id', username: 'alice', role: 'admin' }
		]);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('my-team'));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data).toHaveLength(1);
	});
});

describe('POST /api/v1/teams/[slug]/members', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue('admin');
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'dave' }));
		expect(res.status).toBe(401);
	});

	it('returns 404 when team not found', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('nonexistent', { username: 'dave' }));
		expect(res.status).toBe(404);
	});

	it('returns 403 when caller is not owner or admin', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(MEMBER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue('member');
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'dave' }));
		expect(res.status).toBe(403);
	});

	it('returns 400 for empty username', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: '' }));
		expect(res.status).toBe(400);
	});

	it('returns 404 when invited user not found', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteByUsername.mockResolvedValue({
			ok: false,
			error: 'User not found',
			code: 'NOT_FOUND'
		});
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'ghost' }));
		expect(res.status).toBe(404);
	});

	it('returns 409 when user already a member', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteByUsername.mockResolvedValue({
			ok: false,
			error: 'Already a member',
			code: 'ALREADY_MEMBER'
		});
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'carol' }));
		expect(res.status).toBe(409);
	});

	it('returns 429 when rate limit exceeded', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteByUsername.mockResolvedValue({
			ok: false,
			error: 'Rate limit',
			code: 'RATE_LIMIT'
		});
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'dave' }));
		expect(res.status).toBe(429);
	});

	it('returns 201 with token when invite created successfully', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteByUsername.mockResolvedValue({
			ok: true,
			invite: { id: 'invite-1', token: 'tok-abc123' }
		});
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'dave' }));
		expect(res.status).toBe(201);
		const json = await res.json();
		expect(json.data.token).toBe('tok-abc123');
	});

	it('owner can invite without needing admin role result', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
		mockGetTeamBySlugForAuth.mockResolvedValue(TEAM);
		mockGetTeamMemberRole.mockResolvedValue(null);
		mockCreateInviteByUsername.mockResolvedValue({
			ok: true,
			invite: { id: 'invite-1', token: 'tok-abc' }
		});
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('my-team', { username: 'newuser' }));
		expect(res.status).toBe(201);
	});
});
