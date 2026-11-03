/**
 * PATCH /api/v1/setups/[id] with the queries mocked: auth, permissions and
 * error mapping. The Revision rules run against a real database in
 * `../publish.integration.test.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishError } from '$lib/server/publishValidation';

const mockGetSetupById = vi.fn();
const mockGetTeamMemberRole = vi.fn();
const mockGetTeamByIdForAuth = vi.fn();
const mockPublishSetupUpdate = vi.fn();

vi.mock('$lib/server/queries/setups', () => ({
	getSetupById: (...args: unknown[]) => mockGetSetupById(...args)
}));

vi.mock('$lib/server/queries/teams', () => ({
	getTeamMemberRole: (...args: unknown[]) => mockGetTeamMemberRole(...args),
	getTeamByIdForAuth: (...args: unknown[]) => mockGetTeamByIdForAuth(...args)
}));

vi.mock('$lib/server/queries/publish', () => ({
	publishSetupUpdate: (...args: unknown[]) => mockPublishSetupUpdate(...args)
}));

// getSetupSummary's select chain resolves to one summary row.
vi.mock('$lib/server/db', () => {
	const row = {
		id: 'setup-1',
		slug: 'my-setup',
		display: null,
		description: 'd',
		visibility: 'public',
		teamSlug: null,
		ownerUsername: 'alice'
	};
	const chain: Record<string, unknown> = {};
	for (const m of ['select', 'from', 'innerJoin', 'leftJoin', 'where']) chain[m] = () => chain;
	chain.limit = async () => [row];
	return { db: chain };
});

const PERSONAL = { id: 'setup-1', userId: 'alice', teamId: null, visibility: 'public' };
const TEAM = { id: 'setup-1', userId: 'alice', teamId: 'team-1', visibility: 'private' };

function makeEvent(userId: string | null, body: unknown) {
	return {
		params: { id: 'setup-1' },
		locals: { user: userId ? { id: userId } : null },
		url: new URL('http://localhost/api/v1/setups/setup-1'),
		request: new Request('http://localhost/api/v1/setups/setup-1', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: typeof body === 'string' ? body : JSON.stringify(body)
		})
	} as unknown as Parameters<(typeof import('./+server'))['PATCH']>[0];
}

async function call(userId: string | null, body: unknown) {
	const { PATCH } = await import('./+server');
	const res = await PATCH(makeEvent(userId, body));
	return { status: res.status, body: await res.json() };
}

const RESULT = {
	revision: 2,
	revisionCreated: true,
	changes: { added: [], updated: ['CLAUDE.md'], removed: [] },
	metadataUpdated: []
};

describe('PATCH /api/v1/setups/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPublishSetupUpdate.mockResolvedValue(RESULT);
		mockGetTeamByIdForAuth.mockResolvedValue({ id: 'team-1', ownerId: 'owner' });
	});

	it('returns 401 when not authenticated', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		expect((await call(null, { baseRevision: 1 })).status).toBe(401);
	});

	it('returns 404 when the setup does not exist', async () => {
		mockGetSetupById.mockResolvedValue(null);
		const res = await call('alice', { baseRevision: 1 });
		expect(res.status).toBe(404);
		expect(res.body.code).toBe('NOT_FOUND');
	});

	it('returns 403 for a non-owner of a personal setup', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		const res = await call('bob', { baseRevision: 1 });
		expect(res.status).toBe(403);
		expect(mockPublishSetupUpdate).not.toHaveBeenCalled();
	});

	it('returns the summary and publish result for the owner', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		const res = await call('alice', {
			baseRevision: 1,
			fingerprint: 'f'.repeat(64),
			description: 'new',
			slug: 'ignored',
			files: [{ path: 'CLAUDE.md', content: 'x', hash: 'ignored' }]
		});
		expect(res.status).toBe(200);
		expect(res.body.data).toEqual({
			setup: expect.objectContaining({
				path: 'alice/my-setup',
				url: 'http://localhost/alice/my-setup'
			}),
			...RESULT
		});
		expect(mockPublishSetupUpdate).toHaveBeenCalledWith('setup-1', 'alice', {
			baseRevision: 1,
			fingerprint: 'f'.repeat(64),
			files: [{ path: 'CLAUDE.md', content: 'x' }],
			metadata: { description: 'new' }
		});
	});

	it('requires baseRevision', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		const res = await call('alice', { description: 'x' });
		expect(res.status).toBe(400);
		expect(res.body.code).toBe('VALIDATION_ERROR');
	});

	it('returns 400 for invalid JSON', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		expect((await call('alice', '{nope')).status).toBe(400);
	});

	it('rejects a bad path before writing', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		const res = await call('alice', {
			baseRevision: 1,
			files: [{ path: '.claude/settings.json', content: '{}' }]
		});
		expect(res.status).toBe(400);
		expect(res.body.code).toBe('SETTINGS_FILE_WHOLE');
		expect(mockPublishSetupUpdate).not.toHaveBeenCalled();
	});

	it('maps REVISION_CONFLICT to 409 with latestRevision', async () => {
		mockGetSetupById.mockResolvedValue(PERSONAL);
		mockPublishSetupUpdate.mockRejectedValue(
			new PublishError('stale', 'REVISION_CONFLICT', 409, { data: null, latestRevision: 3 })
		);
		const res = await call('alice', { baseRevision: 1 });
		expect(res.status).toBe(409);
		expect(res.body).toEqual({
			data: null,
			latestRevision: 3,
			error: 'stale',
			code: 'REVISION_CONFLICT'
		});
	});

	describe('Team Setups', () => {
		beforeEach(() => mockGetSetupById.mockResolvedValue(TEAM));

		it('lets any Team Member publish, including to another member’s setup', async () => {
			mockGetTeamMemberRole.mockResolvedValue('member');
			expect((await call('carol', { baseRevision: 1, description: 'x' })).status).toBe(200);
		});

		it('rejects someone outside the Team', async () => {
			mockGetTeamMemberRole.mockResolvedValue(null);
			expect((await call('eve', { baseRevision: 1 })).status).toBe(403);
		});

		it('rejects a visibility change from a non-Admin member', async () => {
			mockGetTeamMemberRole.mockResolvedValue('member');
			const res = await call('carol', { baseRevision: 1, visibility: 'public' });
			expect(res.status).toBe(403);
			expect(res.body.code).toBe('FORBIDDEN');
			expect(mockPublishSetupUpdate).not.toHaveBeenCalled();
		});

		it('allows a visibility change from a Team Admin or the Team Owner', async () => {
			mockGetTeamMemberRole.mockResolvedValue('admin');
			expect((await call('dave', { baseRevision: 1, visibility: 'public' })).status).toBe(200);
			mockGetTeamMemberRole.mockResolvedValue('member');
			expect((await call('owner', { baseRevision: 1, visibility: 'public' })).status).toBe(200);
		});
	});
});
