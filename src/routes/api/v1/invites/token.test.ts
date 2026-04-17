import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetInviteByToken = vi.fn();
const mockIsInviteValid = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getInviteByToken: (...args: unknown[]) => mockGetInviteByToken(...args),
	isInviteValid: (...args: unknown[]) => mockIsInviteValid(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_INVITE = {
	id: 'inv-1',
	token: 'abc123',
	status: 'pending',
	expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
	teamId: 'team-1',
	teamName: 'My Team',
	teamSlug: 'my-team',
	teamDescription: 'A great team',
	teamAvatarUrl: null,
	invitedByUsername: 'alice',
	invitedByAvatarUrl: null
};

function makeGetEvent(token: string) {
	return {
		params: { token },
		request: new Request(`http://localhost/api/v1/invites/${token}`),
		locals: {}
	} as Parameters<(typeof import('./[token]/+server'))['GET']>[0];
}

describe('GET /api/v1/invites/[token]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when token not found', async () => {
		mockGetInviteByToken.mockResolvedValue(null);

		const { GET } = await import('./[token]/+server');
		const res = await GET(makeGetEvent('missing-token'));
		expect(res.status).toBe(404);
	});

	it('returns invite details when token is valid', async () => {
		mockGetInviteByToken.mockResolvedValue(MOCK_INVITE);
		mockIsInviteValid.mockReturnValue(true);

		const { GET } = await import('./[token]/+server');
		const res = await GET(makeGetEvent('abc123'));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data.teamName).toBe('My Team');
		expect(json.data.teamSlug).toBe('my-team');
		expect(json.data.invitedByUsername).toBe('alice');
		expect(json.data.isValid).toBe(true);
	});

	it('returns invite with isValid=false when expired', async () => {
		const expiredInvite = {
			...MOCK_INVITE,
			status: 'pending',
			expiresAt: new Date(Date.now() - 1000)
		};
		mockGetInviteByToken.mockResolvedValue(expiredInvite);
		mockIsInviteValid.mockReturnValue(false);

		const { GET } = await import('./[token]/+server');
		const res = await GET(makeGetEvent('abc123'));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data.isValid).toBe(false);
	});

	it('returns invite with isValid=false when already used', async () => {
		const usedInvite = { ...MOCK_INVITE, status: 'accepted' };
		mockGetInviteByToken.mockResolvedValue(usedInvite);
		mockIsInviteValid.mockReturnValue(false);

		const { GET } = await import('./[token]/+server');
		const res = await GET(makeGetEvent('abc123'));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data.isValid).toBe(false);
		expect(json.data.status).toBe('accepted');
	});

	it('does not require authentication', async () => {
		mockGetInviteByToken.mockResolvedValue(MOCK_INVITE);
		mockIsInviteValid.mockReturnValue(true);

		const { GET } = await import('./[token]/+server');
		// No auth mock needed - endpoint should work without auth
		const res = await GET(makeGetEvent('abc123'));
		expect(res.status).toBe(200);
	});
});
