import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSetupByIdWithOwner = vi.fn();
const mockUnshareSetup = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getSetupByIdWithOwner: (...args: unknown[]) => mockGetSetupByIdWithOwner(...args)
}));

vi.mock('$lib/server/queries/setupShares', () => ({
	unshareSetup: (...args: unknown[]) => mockUnshareSetup(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

const OWNER = { id: 'owner-id', username: 'alice' };
const SETUP = {
	id: 'setup-uuid',
	userId: 'owner-id',
	name: 'My Setup',
	slug: 'my-setup',
	visibility: 'private',
	ownerUsername: 'alice'
};

function makeDeleteEvent(setupId: string, userId: string) {
	return {
		params: { id: setupId, userId },
		request: new Request(`http://localhost/api/v1/setups/${setupId}/shares/${userId}`, {
			method: 'DELETE'
		}),
		locals: {}
	} as Parameters<(typeof import('./+server'))['DELETE']>[0];
}

describe('DELETE /api/v1/setups/[id]/shares/[userId]', () => {
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
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('setup-uuid', 'bob-id'));
		expect(res.status).toBe(401);
	});

	it('returns 404 when setup not found', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(null);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('nonexistent', 'bob-id'));
		expect(res.status).toBe(404);
	});

	it('returns 403 when user does not own the setup', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue({ ...SETUP, userId: 'someone-else' });
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('setup-uuid', 'bob-id'));
		expect(res.status).toBe(403);
	});

	it('returns 200 with revoked: true on success', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(SETUP);
		mockUnshareSetup.mockResolvedValue(undefined);
		const { DELETE } = await import('./+server');
		const res = await DELETE(makeDeleteEvent('setup-uuid', 'bob-id'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.revoked).toBe(true);
	});

	it('calls unshareSetup with correct arguments', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(SETUP);
		mockUnshareSetup.mockResolvedValue(undefined);
		const { DELETE } = await import('./+server');
		await DELETE(makeDeleteEvent('setup-uuid', 'bob-id'));
		expect(mockUnshareSetup).toHaveBeenCalledWith('setup-uuid', 'bob-id');
	});
});
