import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPendingReports = vi.fn();
const mockUpdateReportStatus = vi.fn();

vi.mock('$lib/server/queries/reports', () => ({
	getPendingReportsWithDetails: () => mockGetPendingReports(),
	updateReportStatus: (...args: unknown[]) => mockUpdateReportStatus(...args)
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

vi.mock('$lib/server/guards', () => ({
	requireAdmin: vi.fn()
}));

const MOCK_ADMIN = { id: 'admin-id', username: 'admin', isAdmin: true };
const MOCK_REPORTS = [
	{
		id: 'report-1',
		reason: 'spam',
		description: null,
		status: 'pending',
		createdAt: new Date('2026-01-01'),
		setupId: 'setup-1',
		setupName: 'Spammy Setup',
		setupSlug: 'spammy-setup',
		ownerUsername: 'spammer',
		reporterId: 'user-1',
		reporterUsername: 'alice',
		reporterAvatarUrl: 'https://example.com/alice.png'
	}
];

function makeGetEvent(user: unknown = MOCK_ADMIN) {
	return {
		locals: { user },
		request: new Request('http://localhost/admin/reports')
	} as Parameters<(typeof import('./+server'))['GET']>[0];
}

function makePostEvent(body: unknown, user: unknown = MOCK_ADMIN) {
	return {
		locals: { user },
		request: new Request('http://localhost/admin/reports', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

describe('GET /admin/reports', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(MOCK_ADMIN as never);
	});

	it('returns 401 when not authenticated', async () => {
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(
			new Response(JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent(undefined));
		expect(res.status).toBe(401);
	});

	it('returns list of pending reports', async () => {
		mockGetPendingReports.mockResolvedValue(MOCK_REPORTS);
		const { GET } = await import('./+server');
		const res = await GET(makeGetEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.reports).toHaveLength(1);
		expect(body.data.reports[0]).toHaveProperty('id', 'report-1');
	});
});

describe('POST /admin/reports (update status)', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		const { requireAdmin } = await import('$lib/server/guards');
		vi.mocked(requireAdmin).mockReturnValue(MOCK_ADMIN as never);
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
		const res = await POST(makePostEvent({ reportId: 'report-1', status: 'dismissed' }, undefined));
		expect(res.status).toBe(401);
	});

	it('dismisses a report', async () => {
		mockUpdateReportStatus.mockResolvedValue({ id: 'report-1', status: 'dismissed' });
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({ reportId: 'a0000000-0000-4000-8000-000000000001', status: 'dismissed' })
		);
		expect(res.status).toBe(200);
		expect(mockUpdateReportStatus).toHaveBeenCalledWith(
			'a0000000-0000-4000-8000-000000000001',
			'dismissed',
			'admin-id'
		);
	});

	it('actions a report', async () => {
		mockUpdateReportStatus.mockResolvedValue({ id: 'report-1', status: 'actioned' });
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({ reportId: 'a0000000-0000-4000-8000-000000000001', status: 'actioned' })
		);
		expect(res.status).toBe(200);
		expect(mockUpdateReportStatus).toHaveBeenCalledWith(
			'a0000000-0000-4000-8000-000000000001',
			'actioned',
			'admin-id'
		);
	});

	it('returns 400 for invalid status', async () => {
		const { POST } = await import('./+server');
		const res = await POST(
			makePostEvent({ reportId: 'a0000000-0000-4000-8000-000000000001', status: 'bogus' })
		);
		expect(res.status).toBe(400);
	});

	it('returns 400 for invalid reportId', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makePostEvent({ reportId: 'not-a-uuid', status: 'dismissed' }));
		expect(res.status).toBe(400);
	});
});
