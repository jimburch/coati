import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIssue, createFeedbackIssue } from './github-issues';

const BASE_PARAMS = {
	token: 'test-token',
	owner: 'testowner',
	repo: 'testrepo'
};

function mockFetchWith(responses: Array<{ ok: boolean; status: number; json?: unknown }>) {
	let call = 0;
	return vi.fn().mockImplementation(() => {
		const res = responses[call++] ?? responses[responses.length - 1];
		return Promise.resolve({
			ok: res.ok,
			status: res.status,
			json: () => Promise.resolve(res.json ?? {})
		});
	});
}

describe('createIssue', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('creates labels then the issue', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 }, // label 1
			{ ok: true, status: 201 }, // label 2
			{
				ok: true,
				status: 201,
				json: { number: 42, html_url: 'https://github.com/testowner/testrepo/issues/42' }
			}
		]);
		vi.stubGlobal('fetch', fetchMock);

		const result = await createIssue({
			...BASE_PARAMS,
			title: 'Test issue',
			body: 'Test body',
			labels: ['label-a', 'label-b']
		});

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(result.number).toBe(42);
		expect(result.html_url).toBe('https://github.com/testowner/testrepo/issues/42');
	});

	it('sends correct Authorization header', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 },
			{ ok: true, status: 201, json: { number: 1, html_url: 'https://github.com/t/r/issues/1' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		await createIssue({
			...BASE_PARAMS,
			title: 'T',
			body: 'B',
			labels: ['label-x']
		});

		const [, labelOpts] = fetchMock.mock.calls[0];
		expect((labelOpts as RequestInit).headers).toMatchObject({
			Authorization: 'Bearer test-token'
		});
	});

	it('ignores 422 (label already exists) when creating labels', async () => {
		const fetchMock = mockFetchWith([
			{ ok: false, status: 422 }, // label already exists — OK
			{ ok: true, status: 201, json: { number: 7, html_url: 'https://github.com/t/r/issues/7' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		const result = await createIssue({
			...BASE_PARAMS,
			title: 'T',
			body: 'B',
			labels: ['existing-label']
		});

		expect(result.number).toBe(7);
	});

	it('throws when label creation fails with non-422 error', async () => {
		const fetchMock = mockFetchWith([{ ok: false, status: 403 }]);
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			createIssue({ ...BASE_PARAMS, title: 'T', body: 'B', labels: ['label-x'] })
		).rejects.toThrow('Failed to create label');
	});

	it('throws when issue creation fails', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 }, // label
			{ ok: false, status: 500 } // issue creation fails
		]);
		vi.stubGlobal('fetch', fetchMock);

		await expect(
			createIssue({ ...BASE_PARAMS, title: 'T', body: 'B', labels: ['label-x'] })
		).rejects.toThrow('Failed to create GitHub issue');
	});

	it('sends issue to correct URL', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 },
			{ ok: true, status: 201, json: { number: 5, html_url: 'https://github.com/t/r/issues/5' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		await createIssue({ ...BASE_PARAMS, title: 'T', body: 'B', labels: ['l'] });

		const [issueUrl] = fetchMock.mock.calls[1];
		expect(issueUrl).toBe('https://api.github.com/repos/testowner/testrepo/issues');
	});
});

describe('createFeedbackIssue', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('includes beta-feedback and category labels', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 }, // beta-feedback label
			{ ok: true, status: 201 }, // bug label
			{ ok: true, status: 201, json: { number: 10, html_url: 'https://github.com/t/r/issues/10' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		await createFeedbackIssue({
			...BASE_PARAMS,
			category: 'bug',
			title: 'App crashes',
			description: 'It breaks',
			pageUrl: 'https://coati.dev/explore',
			username: 'alice'
		});

		// Issue creation call body should include both labels
		const [, issueOpts] = fetchMock.mock.calls[2];
		const body = JSON.parse((issueOpts as RequestInit).body as string);
		expect(body.labels).toContain('beta-feedback');
		expect(body.labels).toContain('bug');
	});

	it('includes page URL and username in issue body', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 },
			{ ok: true, status: 201 },
			{ ok: true, status: 201, json: { number: 11, html_url: 'https://github.com/t/r/issues/11' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		await createFeedbackIssue({
			...BASE_PARAMS,
			category: 'improvement',
			title: 'Better search',
			description: 'Make it faster',
			pageUrl: 'https://coati.dev/explore',
			username: 'bob'
		});

		const [, issueOpts] = fetchMock.mock.calls[2];
		const body = JSON.parse((issueOpts as RequestInit).body as string);
		expect(body.body).toContain('https://coati.dev/explore');
		expect(body.body).toContain('@bob');
	});

	it('uses feature-request label for feature-request category', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 },
			{ ok: true, status: 201 },
			{ ok: true, status: 201, json: { number: 12, html_url: 'https://github.com/t/r/issues/12' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		await createFeedbackIssue({
			...BASE_PARAMS,
			category: 'feature-request',
			title: 'Dark mode',
			description: 'Please add dark mode',
			pageUrl: 'https://coati.dev/settings',
			username: 'carol'
		});

		const [, issueOpts] = fetchMock.mock.calls[2];
		const body = JSON.parse((issueOpts as RequestInit).body as string);
		expect(body.labels).toContain('feature-request');
	});

	it('includes title and description in issue body', async () => {
		const fetchMock = mockFetchWith([
			{ ok: true, status: 201 },
			{ ok: true, status: 201 },
			{ ok: true, status: 201, json: { number: 13, html_url: 'https://github.com/t/r/issues/13' } }
		]);
		vi.stubGlobal('fetch', fetchMock);

		await createFeedbackIssue({
			...BASE_PARAMS,
			category: 'bug',
			title: 'Login fails',
			description: 'Cannot log in after session expires',
			pageUrl: 'https://coati.dev/',
			username: 'dave'
		});

		const [, issueOpts] = fetchMock.mock.calls[2];
		const body = JSON.parse((issueOpts as RequestInit).body as string);
		expect(body.body).toContain('Login fails');
		expect(body.body).toContain('Cannot log in after session expires');
		expect(body.title).toBe('Login fails');
	});
});
