import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeamSetupBySlug = vi.fn();
const mockCanViewSetup = vi.fn();
const mockGetSetupFiles = vi.fn();

vi.mock('$lib/server/queries/teams', () => ({
	getTeamSetupBySlug: (...args: unknown[]) => mockGetTeamSetupBySlug(...args)
}));

vi.mock('$lib/server/queries/access', () => ({
	canViewSetup: (...args: unknown[]) => mockCanViewSetup(...args)
}));

vi.mock('$lib/server/queries/setups', () => ({
	getSetupFiles: (...args: unknown[]) => mockGetSetupFiles(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const PUBLIC_SETUP = {
	id: 'setup-1',
	userId: 'user-1',
	name: 'Shared Setup',
	slug: 'shared-setup',
	description: 'A team setup',
	visibility: 'public' as const,
	teamId: 'team-1'
};

const PRIVATE_SETUP = {
	...PUBLIC_SETUP,
	visibility: 'private' as const
};

const MOCK_FILES = [
	{ id: 'f1', path: 'CLAUDE.md', content: '# Hello', setupId: 'setup-1' },
	{ id: 'f2', path: '.claude/settings.json', content: '{}', setupId: 'setup-1' }
];

function makeGetEvent(slug: string, setupSlug: string, userId?: string) {
	return {
		params: { slug, setupSlug },
		locals: { user: userId ? { id: userId } : null }
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

describe('GET /api/v1/teams/[slug]/setups/[setupSlug]/files — access matrix', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 200 with files for public setup — anonymous viewer', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(PUBLIC_SETUP);
		mockCanViewSetup.mockResolvedValue(true);
		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('acme', 'shared-setup'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(2);
	});

	it('returns 200 with files for public setup — authenticated non-member', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(PUBLIC_SETUP);
		mockCanViewSetup.mockResolvedValue(true);
		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('acme', 'shared-setup', 'other-user'));
		expect(res.status).toBe(200);
	});

	it('returns 200 with files for private setup — team member', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(PRIVATE_SETUP);
		mockCanViewSetup.mockResolvedValue(true);
		mockGetSetupFiles.mockResolvedValue(MOCK_FILES);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('acme', 'shared-setup', 'member-user'));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toHaveLength(2);
	});

	it('returns 404 for private setup — anonymous viewer', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(PRIVATE_SETUP);
		mockCanViewSetup.mockResolvedValue(false);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('acme', 'shared-setup'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns 404 for private setup — authenticated non-member', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(PRIVATE_SETUP);
		mockCanViewSetup.mockResolvedValue(false);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('acme', 'shared-setup', 'non-member'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('returns 404 for nonexistent team or setup', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(null);

		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent('nonexistent-team', 'nonexistent-setup'));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	it('passes correct teamSlug and setupSlug to getTeamSetupBySlug', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(null);

		const { GET } = await import('./+server');
		await GET(makeGetEvent('acme', 'shared-setup', 'user-1'));
		expect(mockGetTeamSetupBySlug).toHaveBeenCalledWith('acme', 'shared-setup');
	});

	it('does not call getSetupFiles when access is denied', async () => {
		mockGetTeamSetupBySlug.mockResolvedValue(PRIVATE_SETUP);
		mockCanViewSetup.mockResolvedValue(false);

		const { GET } = await import('./+server');
		await GET(makeGetEvent('acme', 'shared-setup'));
		expect(mockGetSetupFiles).not.toHaveBeenCalled();
	});
});
