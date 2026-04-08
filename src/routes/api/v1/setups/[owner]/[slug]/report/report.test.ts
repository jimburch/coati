import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateReport = vi.fn();
const mockGetByOwnerSlug = vi.fn();

vi.mock('$lib/server/queries/reports', () => ({
	createReport: (...args: unknown[]) => mockCreateReport(...args)
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
	requireApiAuth: vi.fn()
}));

const MOCK_USER = { id: 'user-id', username: 'testuser' };
const MOCK_SETUP = { id: 'setup-id', name: 'Test Setup', slug: 'test-setup' };

function makePostEvent(body: unknown, params = { owner: 'alice', slug: 'test-setup' }) {
	return {
		params,
		request: new Request('http://localhost/api/v1/setups/alice/test-setup/report', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: {}
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('POST /api/v1/setups/[owner]/[slug]/report', () => {
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
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ reason: 'spam' }));
		expect(res.status).toBe(401);
	});

	it('returns 404 when setup not found', async () => {
		mockGetByOwnerSlug.mockResolvedValue(null);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ reason: 'spam' }));
		expect(res.status).toBe(404);
	});

	it('creates a report and returns 201', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateReport.mockResolvedValue({ id: 'report-id', reason: 'spam', status: 'pending' });
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ reason: 'spam', description: 'spammy setup' }));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data).toHaveProperty('id', 'report-id');
	});

	it('passes reason and description to createReport', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		mockCreateReport.mockResolvedValue({ id: 'report-id', reason: 'malicious', status: 'pending' });
		const { POST } = await import('./+server');
		await POST(makePostEvent({ reason: 'malicious', description: 'has malware' }));
		expect(mockCreateReport).toHaveBeenCalledWith(
			'setup-id',
			'user-id',
			'malicious',
			'has malware'
		);
	});

	it('returns 400 when reason is invalid', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ reason: 'invalid-reason' }));
		expect(res.status).toBe(400);
	});

	it('returns 409 when duplicate report', async () => {
		mockGetByOwnerSlug.mockResolvedValue(MOCK_SETUP);
		const err = Object.assign(new Error('unique violation'), { code: '23505' });
		mockCreateReport.mockRejectedValue(err);
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ reason: 'spam' }));
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('DUPLICATE_REPORT');
	});
});
