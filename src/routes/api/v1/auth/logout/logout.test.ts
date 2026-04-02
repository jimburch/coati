import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
	env: {
		GITHUB_CLIENT_ID: 'test-client-id',
		GITHUB_CLIENT_SECRET: 'test-client-secret'
	}
}));

// Mock auth helpers
const mockValidateSessionToken = vi.fn();
const mockInvalidateSession = vi.fn();

vi.mock('$lib/server/auth', () => ({
	validateSessionToken: (token: unknown) => mockValidateSessionToken(token),
	invalidateSession: (sessionId: unknown) => mockInvalidateSession(sessionId)
}));

// Use real responses module
vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

function makeRequest(headers: Record<string, string> = {}) {
	return {
		request: {
			headers: {
				get: (name: string) => headers[name.toLowerCase()] ?? null
			}
		}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

const MOCK_SESSION_RESULT = {
	session: { id: 'hashed-session-id', userId: 'user-123', expiresAt: new Date() },
	user: { id: 'user-123', username: 'testuser' }
};

describe('POST /api/v1/auth/logout', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInvalidateSession.mockResolvedValue(undefined);
	});

	it('returns 401 when Authorization header is missing', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeRequest());
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.code).toBe('UNAUTHORIZED');
	});

	it('returns 401 when Authorization header does not start with Bearer', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ authorization: 'Basic sometoken' }));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.code).toBe('UNAUTHORIZED');
	});

	it('returns 401 when token is invalid or expired', async () => {
		mockValidateSessionToken.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ authorization: 'Bearer invalid-token' }));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.code).toBe('UNAUTHORIZED');
	});

	it('returns 200 with { data: { success: true } } on valid token', async () => {
		mockValidateSessionToken.mockResolvedValue(MOCK_SESSION_RESULT);
		const { POST } = await import('./+server');
		const res = await POST(makeRequest({ authorization: 'Bearer valid-token' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual({ success: true });
	});

	it('calls validateSessionToken with the extracted token', async () => {
		mockValidateSessionToken.mockResolvedValue(MOCK_SESSION_RESULT);
		const { POST } = await import('./+server');
		await POST(makeRequest({ authorization: 'Bearer my-session-token' }));
		expect(mockValidateSessionToken).toHaveBeenCalledWith('my-session-token');
	});

	it('calls invalidateSession with the session id', async () => {
		mockValidateSessionToken.mockResolvedValue(MOCK_SESSION_RESULT);
		const { POST } = await import('./+server');
		await POST(makeRequest({ authorization: 'Bearer valid-token' }));
		expect(mockInvalidateSession).toHaveBeenCalledWith('hashed-session-id');
	});

	it('does not call invalidateSession when token is invalid', async () => {
		mockValidateSessionToken.mockResolvedValue(null);
		const { POST } = await import('./+server');
		await POST(makeRequest({ authorization: 'Bearer bad-token' }));
		expect(mockInvalidateSession).not.toHaveBeenCalled();
	});
});
