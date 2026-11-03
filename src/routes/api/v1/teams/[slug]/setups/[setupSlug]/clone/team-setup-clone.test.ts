import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamSetupBySlug = vi.fn();
const mockCanViewSetup = vi.fn();
const mockCloneResponse = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamSetupBySlug: (...args: unknown[]) => mockGetTeamSetupBySlug(...args)
}));

vi.mock('$lib/server/queries/access', () => ({
	canViewSetup: (...args: unknown[]) => mockCanViewSetup(...args)
}));

vi.mock('$lib/server/queries/setups', () => ({
	getSlugRedirect: async () => null,
	getTeamSlugRedirect: async () => null
}));

vi.mock('$lib/server/readApi', () => ({
	cloneResponse: (...args: unknown[]) => mockCloneResponse(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const MOCK_SETUP = {
	id: 'setup-1',
	userId: 'user-1',
	name: 'Shared Setup',
	slug: 'shared-setup',
	description: 'A team setup',
	visibility: 'public' as const,
	teamId: 'team-1'
};

function makePostEvent(slug: string, setupSlug: string, userId?: string) {
	return {
		params: { slug, setupSlug },
		locals: { user: userId ? { id: userId } : null },
		request: new Request('http://localhost/x', {
			method: 'POST',
			headers: { 'X-Coati-CLI': '1.0.0' }
		})
	} as unknown as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/teams/[slug]/setups/[setupSlug]/clone', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCloneResponse.mockImplementation(
			async () => new Response(JSON.stringify({ data: { firstClone: true, clonesCount: 1 } }))
		);
	});

	it('records the clone and returns 200 on success', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(true);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('acme', 'shared-setup', 'user-1'));
		expect(res.status).toBe(200);
		expect(mockCloneResponse).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: 'setup-1' })
		);
	});

	it('returns 404 when setup does not exist', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(null);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('nonexistent', 'missing'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
		expect(mockCloneResponse).not.toHaveBeenCalled();
	});

	it('returns 404 when viewer cannot access private setup', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue({ ...MOCK_SETUP, visibility: 'private' as const });
		mockCanViewSetup.mockResolvedValue(false);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('acme', 'shared-setup'));
		expect(res.status).toBe(404);
		expect(mockCloneResponse).not.toHaveBeenCalled();
	});

	it('passes teamSlug and setupSlug to getTeamSetupBySlug', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(null);

		const { POST } = await import('./+server');
		await POST(makePostEvent('acme', 'shared-setup', 'user-1'));
		expect(mockGetTeamSetupBySlug).toHaveBeenCalledWith('acme', 'shared-setup');
	});

	it('answers 426 for an outdated CLI before looking anything up', async () => {
		const { POST } = await import('./+server');
		const event = makePostEvent('acme', 'shared-setup');
		Object.assign(event, { request: new Request('http://localhost/x', { method: 'POST' }) });
		const res = await POST(event);
		expect(res.status).toBe(426);
		expect(mockGetTeamSetupBySlug).not.toHaveBeenCalled();
	});

	it('allows anonymous clone of public setup', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(true);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('acme', 'shared-setup'));
		expect(res.status).toBe(200);
		expect(mockCloneResponse).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: 'setup-1' })
		);
	});
});
