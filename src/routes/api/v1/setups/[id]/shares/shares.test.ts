import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSetupByIdWithOwner = vi.fn();
const mockGetUserByUsername = vi.fn();
const mockShareSetup = vi.fn();
const mockGetSetupShares = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getSetupByIdWithOwner: (...args: unknown[]) => mockGetSetupByIdWithOwner(...args)
}));

vi.mock('$lib/server/queries/users', () => ({
	getUserByUsername: (...args: unknown[]) => mockGetUserByUsername(...args)
}));

vi.mock('$lib/server/queries/setupShares', () => ({
	shareSetup: (...args: unknown[]) => mockShareSetup(...args),
	getSetupShares: (...args: unknown[]) => mockGetSetupShares(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

const OWNER = { id: 'owner-id', username: 'alice', hasBetaFeatures: true };
const OTHER_USER = { id: 'other-id', username: 'bob', hasBetaFeatures: true };
const PRIVATE_SETUP = {
	id: 'setup-uuid',
	userId: 'owner-id',
	name: 'My Setup',
	slug: 'my-setup',
	visibility: 'private',
	ownerUsername: 'alice'
};
const PUBLIC_SETUP = { ...PRIVATE_SETUP, visibility: 'public' };

function makeGetEvent(setupId: string) {
	return {
		params: { id: setupId },
		request: new Request(`http://localhost/api/v1/setups/${setupId}/shares`),
		locals: {}
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

function makePostEvent(setupId: string, body: unknown) {
	return {
		params: { id: setupId },
		request: new Request(`http://localhost/api/v1/setups/${setupId}/shares`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: {}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('GET /api/v1/setups/[id]/shares', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('setup-uuid'));
		expect(res.status).toBe(401);
	});

	it('returns 404 when setup not found', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nonexistent'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when user does not own the setup', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue({ ...PRIVATE_SETUP, userId: 'someone-else' });
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('setup-uuid'));
		expect(res.status).toBe(403);
	});

	it('returns 200 with list of shares', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PRIVATE_SETUP);
		const shares = [
			{
				id: 'share-1',
				sharedWithUserId: 'bob-id',
				sharedWithUsername: 'bob',
				sharedWithAvatarUrl: null,
				createdAt: new Date()
			}
		];
		mockGetSetupShares.mockResolvedValue(shares);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('setup-uuid'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(1);
		expect(body.data[0].sharedWithUsername).toBe('bob');
	});
});

describe('POST /api/v1/setups/[id]/shares', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(OWNER as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'bob' }));
		expect(res.status).toBe(401);
	});

	it('returns 404 when setup not found', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'bob' }));
		expect(res.status).toBe(404);
	});

	it('returns 403 when user does not own the setup', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue({ ...PRIVATE_SETUP, userId: 'someone-else' });
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'bob' }));
		expect(res.status).toBe(403);
	});

	it('returns 400 when setup is public', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PUBLIC_SETUP);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'bob' }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('INVALID_VISIBILITY');
	});

	it('returns 404 when target user not found', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PRIVATE_SETUP);
		mockGetUserByUsername.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'nonexistent' }));
		expect(res.status).toBe(404);
	});

	it('returns 400 when sharing with yourself', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PRIVATE_SETUP);
		mockGetUserByUsername.mockResolvedValue({ id: 'owner-id', username: 'alice' });
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'alice' }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('INVALID_TARGET');
	});

	it('returns 409 when already shared with user', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PRIVATE_SETUP);
		mockGetUserByUsername.mockResolvedValue(OTHER_USER);
		const uniqueViolation = Object.assign(new Error('unique violation'), { code: '23505' });
		mockShareSetup.mockRejectedValue(uniqueViolation);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'bob' }));
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('ALREADY_SHARED');
	});

	it('returns 201 with share on success', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PRIVATE_SETUP);
		mockGetUserByUsername.mockResolvedValue(OTHER_USER);
		const share = { id: 'share-1', setupId: 'setup-uuid', sharedWithUserId: 'other-id' };
		mockShareSetup.mockResolvedValue(share);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', { username: 'bob' }));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.id).toBe('share-1');
	});

	it('returns 400 when username is missing', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(PRIVATE_SETUP);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('setup-uuid', {}));
		expect(res.status).toBe(400);
	});
});
