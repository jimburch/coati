import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUserByUsername = vi.fn();

vi.mock('$lib/server/queries/users', () => ({
	getUserByUsername: (...args: unknown[]) => mockGetUserByUsername(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

function makeEvent(username: string) {
	return {
		params: { username },
		locals: { user: null },
		request: new Request('http://localhost')
	} as unknown as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/users/[username]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 when user is not found', async () => {
		mockGetUserByUsername.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('ghost'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns the user envelope when found', async () => {
		const user = { id: 'user-1', username: 'alice', avatarUrl: null };
		mockGetUserByUsername.mockResolvedValue(user);
		const { GET } = await import('./+server');
		const res = await GET(makeEvent('alice'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ data: user });
	});
});
