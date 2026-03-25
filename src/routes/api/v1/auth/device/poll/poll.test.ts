import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/private', () => ({
	GITHUB_CLIENT_ID: 'test-client-id',
	GITHUB_CLIENT_SECRET: 'test-client-secret'
}));

// Mock DB
const mockFindFirstState = vi.fn();
const mockFindFirstUser = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			deviceFlowStates: { findFirst: (opts: unknown) => mockFindFirstState(opts) },
			users: { findFirst: (opts: unknown) => mockFindFirstUser(opts) }
		},
		delete: () => ({ where: (cond: unknown) => mockDeleteWhere(cond) })
	}
}));

// Mock auth helpers
const mockUpsertGithubUser = vi.fn();
const mockGenerateSessionToken = vi.fn();
const mockCreateSession = vi.fn();

vi.mock('$lib/server/auth', () => ({
	upsertGithubUser: (token: unknown) => mockUpsertGithubUser(token),
	generateSessionToken: () => mockGenerateSessionToken(),
	createSession: (token: unknown, userId: unknown) => mockCreateSession(token, userId)
}));

// Use real responses module
vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const FUTURE_DATE = new Date(Date.now() + 60_000);
const EXPIRED_DATE = new Date(Date.now() - 1000);

const MOCK_STATE = {
	id: 'state-id',
	deviceCode: 'device-code-123',
	githubDeviceCode: 'gh-device-code-abc',
	expiresAt: FUTURE_DATE
};

function makeRequest(body: unknown) {
	return {
		request: {
			json: () => Promise.resolve(body)
		}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/auth/device/poll', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteWhere.mockResolvedValue(undefined);
	});

	it('returns 400 when deviceCode is missing', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({}));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	it('returns 404 when device code is unknown', async () => {
		mockFindFirstState.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'unknown' }));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns 410 when device code is expired', async () => {
		mockFindFirstState.mockResolvedValue({ ...MOCK_STATE, expiresAt: EXPIRED_DATE });
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		expect(res.status).toBe(410);
		const body = await res.json();
		expect(body.code).toBe('EXPIRED');
	});

	it('returns 202 with status pending when GitHub returns authorization_pending', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ error: 'authorization_pending' })
		});
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		expect(res.status).toBe(202);
		const body = await res.json();
		expect(body.data.status).toBe('pending');
	});

	it('returns 429 with status slow_down when GitHub returns slow_down', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ error: 'slow_down' })
		});
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		expect(res.status).toBe(429);
		const body = await res.json();
		expect(body.data.status).toBe('slow_down');
	});

	it('returns 400 on other GitHub errors', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ error: 'access_denied' })
		});
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('DEVICE_FLOW_ERROR');
	});

	it('returns { data: { token, username } } on success', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ access_token: 'gh-access-token' })
		});
		mockUpsertGithubUser.mockResolvedValue('user-uuid-123');
		mockGenerateSessionToken.mockReturnValue('session-token-abc');
		mockCreateSession.mockResolvedValue(undefined);
		mockFindFirstUser.mockResolvedValue({ id: 'user-uuid-123', username: 'octocat' });

		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual({ token: 'session-token-abc', username: 'octocat' });
	});

	it('success response includes token string', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ access_token: 'gh-access-token' })
		});
		mockUpsertGithubUser.mockResolvedValue('user-uuid-456');
		mockGenerateSessionToken.mockReturnValue('my-token');
		mockCreateSession.mockResolvedValue(undefined);
		mockFindFirstUser.mockResolvedValue({ id: 'user-uuid-456', username: 'coatiuser' });

		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		const body = await res.json();
		expect(typeof body.data.token).toBe('string');
		expect(body.data.token).toBe('my-token');
	});

	it('success response includes username string', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ access_token: 'gh-access-token' })
		});
		mockUpsertGithubUser.mockResolvedValue('user-uuid-789');
		mockGenerateSessionToken.mockReturnValue('token-xyz');
		mockCreateSession.mockResolvedValue(undefined);
		mockFindFirstUser.mockResolvedValue({ id: 'user-uuid-789', username: 'devuser' });

		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ deviceCode: 'device-code-123' }));
		const body = await res.json();
		expect(typeof body.data.username).toBe('string');
		expect(body.data.username).toBe('devuser');
	});

	it('cleans up device flow state on success', async () => {
		mockFindFirstState.mockResolvedValue(MOCK_STATE);
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ access_token: 'gh-access-token' })
		});
		mockUpsertGithubUser.mockResolvedValue('user-uuid-123');
		mockGenerateSessionToken.mockReturnValue('session-token');
		mockCreateSession.mockResolvedValue(undefined);
		mockFindFirstUser.mockResolvedValue({ id: 'user-uuid-123', username: 'octocat' });

		const { POST } = await import('./+server');
		await POST(makeRequest({ deviceCode: 'device-code-123' }));
		expect(mockDeleteWhere).toHaveBeenCalled();
	});
});
