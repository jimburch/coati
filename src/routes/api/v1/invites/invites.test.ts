import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPendingInvites = vi.fn();
const mockAcceptInvite = vi.fn();
const mockDeclineInvite = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getPendingInvites: (...args: unknown[]) => mockGetPendingInvites(...args),
	acceptInvite: (...args: unknown[]) => mockAcceptInvite(...args),
	declineInvite: (...args: unknown[]) => mockDeclineInvite(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn(),
	requireBetaFeatures: vi.fn()
}));

const USER = { id: 'user-id', username: 'alice', hasBetaFeatures: true };

function makePendingGetEvent() {
	return {
		params: {},
		request: new Request('http://localhost/api/v1/invites/pending'),
		locals: {}
	} as Parameters<(typeof import('./pending/+server'))['GET']>[0];
}

function makeAcceptEvent(token: string) {
	return {
		params: { token },
		request: new Request(`http://localhost/api/v1/invites/${token}/accept`, { method: 'POST' }),
		locals: {}
	} as Parameters<(typeof import('./[token]/accept/+server'))['POST']>[0];
}

function makeDeclineEvent(token: string) {
	return {
		params: { token },
		request: new Request(`http://localhost/api/v1/invites/${token}/decline`, { method: 'POST' }),
		locals: {}
	} as Parameters<(typeof import('./[token]/decline/+server'))['POST']>[0];
}

describe('GET /api/v1/invites/pending', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
		mockGetPendingInvites.mockResolvedValue([]);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { GET } = await import('./pending/+server');
		const res = await GET(makePendingGetEvent());
		expect(res.status).toBe(401);
	});

	it('returns empty array when no pending invites', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
		mockGetPendingInvites.mockResolvedValue([]);
		const { GET } = await import('./pending/+server');
		const res = await GET(makePendingGetEvent());
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data).toEqual([]);
	});

	it('returns pending invites list', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
		mockGetPendingInvites.mockResolvedValue([
			{ id: 'inv-1', teamName: 'My Team', token: 'tok123' }
		]);
		const { GET } = await import('./pending/+server');
		const res = await GET(makePendingGetEvent());
		const json = await res.json();
		expect(json.data).toHaveLength(1);
		expect(json.data[0].teamName).toBe('My Team');
	});
});

describe('POST /api/v1/invites/[token]/accept', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(USER as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(
			new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { POST } = await import('./[token]/accept/+server');
		const res = await POST(makeAcceptEvent('tok123'));
		expect(res.status).toBe(401);
	});

	it('returns 404 when invite not found', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(USER as never);
		mockAcceptInvite.mockResolvedValue({
			ok: false,
			error: 'Invite not found',
			code: 'NOT_FOUND'
		});
		const { POST } = await import('./[token]/accept/+server');
		const res = await POST(makeAcceptEvent('bad-token'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when invite belongs to different user', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(USER as never);
		mockAcceptInvite.mockResolvedValue({ ok: false, error: 'Not for you', code: 'FORBIDDEN' });
		const { POST } = await import('./[token]/accept/+server');
		const res = await POST(makeAcceptEvent('tok123'));
		expect(res.status).toBe(403);
	});

	it('returns 410 when invite has expired', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(USER as never);
		mockAcceptInvite.mockResolvedValue({ ok: false, error: 'Expired', code: 'EXPIRED' });
		const { POST } = await import('./[token]/accept/+server');
		const res = await POST(makeAcceptEvent('tok123'));
		expect(res.status).toBe(410);
	});

	it('returns 200 when invite accepted successfully', async () => {
		const { requireBetaFeatures } = await import('$lib/server/guards');
		vi.mocked(requireBetaFeatures).mockReturnValue(USER as never);
		mockAcceptInvite.mockResolvedValue({ ok: true });
		const { POST } = await import('./[token]/accept/+server');
		const res = await POST(makeAcceptEvent('valid-token'));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data.accepted).toBe(true);
	});
});

describe('POST /api/v1/invites/[token]/decline', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { POST } = await import('./[token]/decline/+server');
		const res = await POST(makeDeclineEvent('tok123'));
		expect(res.status).toBe(401);
	});

	it('returns 404 when invite not found', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
		mockDeclineInvite.mockResolvedValue({ ok: false, error: 'Not found', code: 'NOT_FOUND' });
		const { POST } = await import('./[token]/decline/+server');
		const res = await POST(makeDeclineEvent('bad-token'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when invite belongs to different user', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
		mockDeclineInvite.mockResolvedValue({ ok: false, error: 'Not for you', code: 'FORBIDDEN' });
		const { POST } = await import('./[token]/decline/+server');
		const res = await POST(makeDeclineEvent('tok123'));
		expect(res.status).toBe(403);
	});

	it('returns 200 when invite declined successfully', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(USER as never);
		mockDeclineInvite.mockResolvedValue({ ok: true });
		const { POST } = await import('./[token]/decline/+server');
		const res = await POST(makeDeclineEvent('valid-token'));
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json.data.declined).toBe(true);
	});
});
