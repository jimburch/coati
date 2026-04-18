import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamSetupBySlug = vi.fn();
const mockCanViewSetup = vi.fn();
const mockRecordClone = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamSetupBySlug: (...args: unknown[]) => mockGetTeamSetupBySlug(...args)
}));

vi.mock('$lib/server/queries/access', () => ({
	canViewSetup: (...args: unknown[]) => mockCanViewSetup(...args)
}));

vi.mock('$lib/server/queries/setups', () => ({
	recordClone: (...args: unknown[]) => mockRecordClone(...args)
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
		locals: { user: userId ? { id: userId } : null }
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/teams/[slug]/setups/[setupSlug]/clone', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRecordClone.mockResolvedValue(undefined);
	});

	it('returns 204 and increments clonesCount on success', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(true);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('acme', 'shared-setup', 'user-1'));
		expect(res.status).toBe(204);
		expect(mockRecordClone).toHaveBeenCalledWith('setup-1');
	});

	it('returns 404 when setup does not exist', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(null);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('nonexistent', 'missing'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
		expect(mockRecordClone).not.toHaveBeenCalled();
	});

	it('returns 404 when viewer cannot access private setup', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue({ ...MOCK_SETUP, visibility: 'private' as const });
		mockCanViewSetup.mockResolvedValue(false);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('acme', 'shared-setup'));
		expect(res.status).toBe(404);
		expect(mockRecordClone).not.toHaveBeenCalled();
	});

	it('passes teamSlug and setupSlug to getTeamSetupBySlug', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(null);

		const { POST } = await import('./+server');
		await POST(makePostEvent('acme', 'shared-setup', 'user-1'));
		expect(mockGetTeamSetupBySlug).toHaveBeenCalledWith('acme', 'shared-setup');
	});

	it('allows anonymous clone of public setup', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(MOCK_SETUP);
		mockCanViewSetup.mockResolvedValue(true);

		const { POST } = await import('./+server');
		const res = await POST(makePostEvent('acme', 'shared-setup'));
		expect(res.status).toBe(204);
		expect(mockRecordClone).toHaveBeenCalledWith('setup-1');
	});
});
