import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUserByUsername = vi.fn();
const mockSetFollow = vi.fn();

vi.mock('$lib/server/queries/users', () => ({
	getUserByUsername: (...args: unknown[]) => mockGetUserByUsername(...args)
}));

vi.mock('$lib/server/queries/follows', () => ({
	setFollow: (...args: unknown[]) => mockSetFollow(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const AUTH_USER = { id: 'user-1', username: 'alice' };
const TARGET_USER = { id: 'user-2', username: 'bob', followersCount: 10 };

function makeEvent(username: string, authUser = AUTH_USER) {
	return {
		params: { username },
		locals: { user: authUser },
		request: new Request('http://localhost')
	} as unknown as Parameters<(typeof import('./+server'))['POST']>[0];
}

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: (event: { locals: { user: unknown } }) => event.locals.user
}));

describe('POST /api/v1/users/[username]/follow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when target user not found', async () => {
		mockGetUserByUsername.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makeEvent('unknown'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toHaveProperty('error');
	});

	it('returns 400 when trying to follow yourself', async () => {
		mockGetUserByUsername.mockResolvedValue({ ...TARGET_USER, id: AUTH_USER.id });
		const { POST } = await import('./+server');
		const res = await POST(makeEvent('alice'));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('SELF_FOLLOW');
	});

	it('calls setFollow with desired=true and returns { following, followersCount }', async () => {
		mockGetUserByUsername.mockResolvedValue(TARGET_USER);
		mockSetFollow.mockResolvedValue({ following: true, followersCount: 11 });
		const { POST } = await import('./+server');
		const res = await POST(makeEvent('bob'));
		expect(mockSetFollow).toHaveBeenCalledWith(AUTH_USER.id, TARGET_USER.id, true);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual({ following: true, followersCount: 11 });
	});

	it('is idempotent — calling POST when already following still succeeds', async () => {
		mockGetUserByUsername.mockResolvedValue(TARGET_USER);
		mockSetFollow.mockResolvedValue({ following: true, followersCount: 10 });
		const { POST } = await import('./+server');
		const res = await POST(makeEvent('bob'));
		expect(mockSetFollow).toHaveBeenCalledWith(AUTH_USER.id, TARGET_USER.id, true);
		expect(res.status).toBe(200);
	});
});

describe('DELETE /api/v1/users/[username]/follow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when target user not found', async () => {
		mockGetUserByUsername.mockResolvedValue(null);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeEvent('unknown'));
		expect(res.status).toBe(404);
	});

	it('returns 400 when trying to unfollow yourself', async () => {
		mockGetUserByUsername.mockResolvedValue({ ...TARGET_USER, id: AUTH_USER.id });
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeEvent('alice'));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('SELF_FOLLOW');
	});

	it('calls setFollow with desired=false and returns { following, followersCount }', async () => {
		mockGetUserByUsername.mockResolvedValue(TARGET_USER);
		mockSetFollow.mockResolvedValue({ following: false, followersCount: 9 });
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeEvent('bob'));
		expect(mockSetFollow).toHaveBeenCalledWith(AUTH_USER.id, TARGET_USER.id, false);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual({ following: false, followersCount: 9 });
	});

	it('is idempotent — calling DELETE when not following still succeeds', async () => {
		mockGetUserByUsername.mockResolvedValue(TARGET_USER);
		mockSetFollow.mockResolvedValue({ following: false, followersCount: 10 });
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeEvent('bob'));
		expect(mockSetFollow).toHaveBeenCalledWith(AUTH_USER.id, TARGET_USER.id, false);
		expect(res.status).toBe(200);
	});
});
