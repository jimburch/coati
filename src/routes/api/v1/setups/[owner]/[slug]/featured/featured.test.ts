import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetFeatured = vi.fn();
const mockGetByOwnerSlug = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	setFeatured: (...args: unknown[]) => mockSetFeatured(...args)
}));

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getByOwnerSlug: (...args: unknown[]) => mockGetByOwnerSlug(...args)
	}
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

const MOCK_ADMIN = { id: 'admin-id', username: 'admin', isAdmin: true };
const MOCK_SETUP = { id: 'setup-id', name: 'Test Setup', slug: 'test-setup', featuredAt: null };

function makePostEvent(body: unknown, params = { owner: 'alice', slug: 'test-setup' }) {
	return {
		params,
		request: new Request('http://localhost/api/v1/setups/alice/test-setup/featured', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: {}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/setups/[owner]/[slug]/featured', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(MOCK_ADMIN as never);
	});

	it('returns 403 when authenticated but not admin', async () => {
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(
			new Response(JSON.stringify({ error: 'Admin access required', code: 'FORBIDDEN' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ featured: true }));
		expect(res.status).toBe(403);
	});

	it('returns 404 when setup not found', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ featured: true }));
		expect(res.status).toBe(404);
	});

	it('returns 400 when body is missing featured field', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({}));
		expect(res.status).toBe(400);
	});

	it('returns 400 when featured is not a boolean', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ featured: 'yes' }));
		expect(res.status).toBe(400);
	});

	it('returns 200 with featured=true and non-null featuredAt when featuring', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockSetFeatured.mockResolvedValue(undefined);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ featured: true }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.featured).toBe(true);
		expect(typeof body.data.featuredAt).toBe('string');
	});

	it('returns 200 with featured=false and null featuredAt when unfeaturing', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockSetFeatured.mockResolvedValue(undefined);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ featured: false }));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.featured).toBe(false);
		expect(body.data.featuredAt).toBeNull();
	});

	it('calls setFeatured with correct setupId and featured value', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockSetFeatured.mockResolvedValue(undefined);
		const { POST } = await import('./+server');
		await POST(makePostEvent({ featured: true }));
		expect(mockSetFeatured).toHaveBeenCalledWith('setup-id', true);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ featured: true }));
		expect(res.status).toBe(401);
	});
});
