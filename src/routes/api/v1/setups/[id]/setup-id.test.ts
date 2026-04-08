import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSetupByIdWithOwner = vi.fn();
const mockUpdateSetupByIdWithSlugRedirects = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getSetupByIdWithOwner: (...args: unknown[]) => mockGetSetupByIdWithOwner(...args),
	updateSetupByIdWithSlugRedirects: (...args: unknown[]) =>
		mockUpdateSetupByIdWithSlugRedirects(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

const MOCK_USER = { id: 'user-uuid-1', username: 'alice' };
const MOCK_SETUP = {
	id: 'setup-uuid-1',
	userId: 'user-uuid-1',
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A great setup',
	readme: null,
	category: null,
	license: null,
	minToolVersion: null,
	postInstall: null,
	prerequisites: null,
	starsCount: 0,
	clonesCount: 0,
	commentsCount: 0,
	featuredAt: null,
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	ownerUsername: 'alice'
};

function makePatchEvent(id: string, body: unknown, overrideParams?: Record<string, string>) {
	return {
		params: overrideParams ?? { id },
		request: new Request(`http://localhost/api/v1/setups/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: {}
	} as Parameters<(typeof import('./+server'))['PATCH']>[0];
}

describe('PATCH /api/v1/setups/[id]', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(MOCK_USER as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('setup-uuid-1', { description: 'Updated' }));
		expect(res.status).toBe(401);
	});

	it('returns 404 when setup not found', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(null);
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('nonexistent-uuid', { description: 'Updated' }));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns 403 when authenticated user does not own the setup', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue({
			...MOCK_SETUP,
			userId: 'other-user-uuid',
			ownerUsername: 'bob'
		});
		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('setup-uuid-1', { description: 'Updated' }));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
	});

	it('returns 200 with updated setup on successful update', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(MOCK_SETUP);
		const updatedSetup = { ...MOCK_SETUP, description: 'Updated description' };
		mockUpdateSetupByIdWithSlugRedirects.mockResolvedValue(updatedSetup);

		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('setup-uuid-1', { description: 'Updated description' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.description).toBe('Updated description');
		expect(body.data.ownerUsername).toBe('alice');
	});

	it('returns 400 when body is invalid JSON', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(MOCK_SETUP);
		const event = {
			params: { id: 'setup-uuid-1' },
			request: new Request('http://localhost/api/v1/setups/setup-uuid-1', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: 'not-json'
			}),
			locals: {}
		} as Parameters<(typeof import('./+server'))['PATCH']>[0];
		const { PATCH } = await import('./+server');
		const res = await PATCH(event);
		expect(res.status).toBe(400);
	});

	it('calls updateSetupByIdWithSlugRedirects with correct arguments', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(MOCK_SETUP);
		const updatedSetup = { ...MOCK_SETUP, name: 'New Name', slug: 'new-name' };
		mockUpdateSetupByIdWithSlugRedirects.mockResolvedValue(updatedSetup);

		const { PATCH } = await import('./+server');
		await PATCH(makePatchEvent('setup-uuid-1', { name: 'New Name' }));

		expect(mockUpdateSetupByIdWithSlugRedirects).toHaveBeenCalledWith(
			'setup-uuid-1',
			expect.objectContaining({ name: 'New Name' }),
			expect.objectContaining({
				userId: 'user-uuid-1',
				currentSlug: 'my-setup'
			})
		);
	});

	it('returns updated setup including current slug and ownerUsername', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(MOCK_SETUP);
		const updatedSetup = { ...MOCK_SETUP, name: 'Renamed Setup', slug: 'renamed-setup' };
		mockUpdateSetupByIdWithSlugRedirects.mockResolvedValue(updatedSetup);

		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('setup-uuid-1', { name: 'Renamed Setup' }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.slug).toBe('renamed-setup');
		expect(body.data.ownerUsername).toBe('alice');
	});

	it('PATCH ignores placement field (stripped by schema)', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(MOCK_SETUP);
		const updatedSetup = { ...MOCK_SETUP, description: 'Updated' };
		mockUpdateSetupByIdWithSlugRedirects.mockResolvedValue(updatedSetup);

		const { PATCH } = await import('./+server');
		const res = await PATCH(
			makePatchEvent('setup-uuid-1', { description: 'Updated', placement: 'global' })
		);
		expect(res.status).toBe(200);
		// placement should not be forwarded to the update function
		expect(mockUpdateSetupByIdWithSlugRedirects).toHaveBeenCalledWith(
			'setup-uuid-1',
			expect.not.objectContaining({ placement: expect.anything() }),
			expect.any(Object)
		);
	});

	it('returns 409 when slug already taken', async () => {
		mockGetSetupByIdWithOwner.mockResolvedValue(MOCK_SETUP);
		const uniqueViolationError = Object.assign(new Error('unique violation'), { code: '23505' });
		mockUpdateSetupByIdWithSlugRedirects.mockRejectedValue(uniqueViolationError);

		const { PATCH } = await import('./+server');
		const res = await PATCH(makePatchEvent('setup-uuid-1', { name: 'Taken Name' }));
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('SLUG_TAKEN');
	});
});
