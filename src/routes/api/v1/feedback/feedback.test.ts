import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateFeedbackIssue = vi.fn();
const mockDbInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

vi.mock('$lib/server/github-issues', () => ({
	createFeedbackIssue: (...args: unknown[]) => mockCreateFeedbackIssue(...args)
}));

vi.mock('$lib/server/db', () => ({
	db: { insert: (...args: unknown[]) => mockDbInsert(...args) }
}));

vi.mock('$lib/server/db/schema', () => ({
	feedbackSubmissions: {}
}));

vi.mock('$env/dynamic/private', () => ({
	env: { GITHUB_FEEDBACK_TOKEN: 'test-gh-token' }
}));

vi.mock('$lib/server/guards', () => ({
	requireApiAuth: vi.fn()
}));

vi.mock('$lib/server/responses', async (importOriginal) => {
	return await importOriginal();
});

const APPROVED_USER = {
	id: 'user-uuid',
	username: 'alice',
	isBetaApproved: true,
	isAdmin: false
};

const UNAPPROVED_USER = {
	id: 'user-uuid-2',
	username: 'bob',
	isBetaApproved: false,
	isAdmin: false
};

function makeEvent(body: unknown, user: unknown = APPROVED_USER) {
	const { requireApiAuth } = vi.mocked(
		import.meta.glob('$lib/server/guards', { eager: true }) as Record<string, unknown>
	) as never;
	void requireApiAuth;

	return {
		locals: { user },
		request: new Request('http://localhost/api/v1/feedback', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as Parameters<(typeof import('./+server'))['POST']>[0];
}

const VALID_BODY = {
	category: 'bug',
	title: 'Something broke',
	description: 'It stopped working after update',
	pageUrl: 'https://coati.dev/explore'
};

describe('POST /api/v1/feedback', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		mockDbInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(APPROVED_USER as never);
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
		const res = await POST(makeEvent(VALID_BODY, null));
		expect(res.status).toBe(401);
	});

	it('returns 403 when user is not beta approved', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue(UNAPPROVED_USER as never);

		const { POST } = await import('./+server');
		const res = await POST(makeEvent(VALID_BODY, UNAPPROVED_USER));
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
	});

	it('returns 400 for missing title', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeEvent({ ...VALID_BODY, title: '' }));
		expect(res.status).toBe(400);
	});

	it('returns 400 for missing description', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeEvent({ ...VALID_BODY, description: '' }));
		expect(res.status).toBe(400);
	});

	it('returns 400 for invalid category', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeEvent({ ...VALID_BODY, category: 'other' }));
		expect(res.status).toBe(400);
	});

	it('returns 400 for invalid pageUrl', async () => {
		const { POST } = await import('./+server');
		const res = await POST(makeEvent({ ...VALID_BODY, pageUrl: 'not-a-url' }));
		expect(res.status).toBe(400);
	});

	it('returns 201 with issueUrl on success', async () => {
		mockCreateFeedbackIssue.mockResolvedValue({
			number: 42,
			html_url: 'https://github.com/jimburch/coati/issues/42'
		});

		const { POST } = await import('./+server');
		const res = await POST(makeEvent(VALID_BODY));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.data.issueUrl).toBe('https://github.com/jimburch/coati/issues/42');
	});

	it('calls createFeedbackIssue with correct params', async () => {
		mockCreateFeedbackIssue.mockResolvedValue({
			number: 1,
			html_url: 'https://github.com/jimburch/coati/issues/1'
		});

		const { POST } = await import('./+server');
		await POST(makeEvent(VALID_BODY));

		expect(mockCreateFeedbackIssue).toHaveBeenCalledWith(
			expect.objectContaining({
				token: 'test-gh-token',
				category: 'bug',
				title: 'Something broke',
				description: 'It stopped working after update',
				pageUrl: 'https://coati.dev/explore',
				username: 'alice'
			})
		);
	});

	it('inserts into feedback_submissions after issue creation', async () => {
		const mockValues = vi.fn().mockResolvedValue(undefined);
		mockDbInsert.mockReturnValue({ values: mockValues });
		mockCreateFeedbackIssue.mockResolvedValue({
			number: 5,
			html_url: 'https://github.com/jimburch/coati/issues/5'
		});

		const { POST } = await import('./+server');
		await POST(makeEvent(VALID_BODY));

		expect(mockDbInsert).toHaveBeenCalled();
		expect(mockValues).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-uuid',
				category: 'bug',
				title: 'Something broke',
				githubIssueUrl: 'https://github.com/jimburch/coati/issues/5'
			})
		);
	});

	it('returns 502 when GitHub issue creation fails', async () => {
		mockCreateFeedbackIssue.mockRejectedValue(new Error('GitHub API error'));

		const { POST } = await import('./+server');
		const res = await POST(makeEvent(VALID_BODY));
		expect(res.status).toBe(502);
		const body = await res.json();
		expect(body.code).toBe('GITHUB_ERROR');
	});

	it('allows admin users even if not beta approved', async () => {
		const { requireApiAuth } = await import('$lib/server/guards');
		vi.mocked(requireApiAuth).mockReturnValue({
			id: 'admin-id',
			username: 'admin',
			isBetaApproved: false,
			isAdmin: true
		} as never);

		mockCreateFeedbackIssue.mockResolvedValue({
			number: 99,
			html_url: 'https://github.com/jimburch/coati/issues/99'
		});

		const { POST } = await import('./+server');
		const res = await POST(makeEvent(VALID_BODY));
		expect(res.status).toBe(201);
	});
});
