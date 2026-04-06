import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetByOwnerSlug = vi.fn();
const mockGetSlugRedirect = vi.fn();

vi.mock('$lib/server/queries/setupRepository', () => ({
	setupRepo: {
		getByOwnerSlug: (...args: unknown[]) => mockGetByOwnerSlug(...args),
		getSlugRedirect: (...args: unknown[]) => mockGetSlugRedirect(...args)
	}
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

const MOCK_SETUP = {
	id: 'setup-uuid-1',
	userId: 'user-uuid-1',
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A great setup',
	readme: null,
	placement: 'project',
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
	ownerUsername: 'alice',
	ownerAvatarUrl: null
};

function makeGetEvent(owner: string, slug: string) {
	return {
		params: { owner, slug },
		request: new Request(`http://localhost/api/v1/setups/${owner}/${slug}`)
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/setups/[owner]/[slug]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with setup when found by slug', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'my-setup'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.slug).toBe('my-setup');
	});

	it('returns 301 redirect to current slug when old slug found in redirects', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue('renamed-setup');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'old-slug'));
		expect(res.status).toBe(301);
		expect(res.headers.get('Location')).toBe('/api/v1/setups/alice/renamed-setup');
	});

	it('returns 404 when slug not found in setups or redirects', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue(null);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'nonexistent'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('redirect Location points directly to current slug (no chains)', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		mockGetSlugRedirect.mockResolvedValue('current-slug');
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('alice', 'first-old-slug'));
		expect(res.status).toBe(301);
		expect(res.headers.get('Location')).toBe('/api/v1/setups/alice/current-slug');
	});
});
