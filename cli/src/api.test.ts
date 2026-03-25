import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, del, get, patch, post } from './api.js';
import { clearConfig, setConfig, setConfigDir } from './config.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFetchResponse(body: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(body),
		headers: { get: () => null }
	} as unknown as Response;
}

function mockFetch(response: Response): void {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

function mockFetchReject(err: Error): void {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));
}

// ── setup / teardown ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-api-test-'));
	setConfigDir(tmpDir);
	clearConfig();
});

afterEach(() => {
	vi.unstubAllGlobals();
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('get', () => {
	it('makes a GET request and returns unwrapped data', async () => {
		mockFetch(makeFetchResponse({ data: { id: 1, name: 'hello' } }));

		const result = await get<{ id: number; name: string }>('/setups');

		expect(result).toEqual({ id: 1, name: 'hello' });
		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			'https://coati.sh/api/v1/setups',
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('sends User-Agent header on GET', async () => {
		mockFetch(makeFetchResponse({ data: null }));

		await get('/setups');

		const [, init] = vi.mocked(fetch).mock.calls[0]!;
		expect((init?.headers as Record<string, string>)['User-Agent']).toMatch(/^@coati\/cli\//);
	});
});

describe('post', () => {
	it('sends JSON body and returns unwrapped data', async () => {
		mockFetch(makeFetchResponse({ data: { id: 42 } }, 201));

		const result = await post<{ id: number }>('/setups', { name: 'my-setup' });

		expect(result).toEqual({ id: 42 });
		const [, init] = vi.mocked(fetch).mock.calls[0]!;
		expect(init?.method).toBe('POST');
		expect(init?.body).toBe(JSON.stringify({ name: 'my-setup' }));
		expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
	});
});

describe('patch', () => {
	it('sends JSON body and returns unwrapped data', async () => {
		mockFetch(makeFetchResponse({ data: { updated: true } }));

		const result = await patch<{ updated: boolean }>('/setups/1', { name: 'new-name' });

		expect(result).toEqual({ updated: true });
		const [, init] = vi.mocked(fetch).mock.calls[0]!;
		expect(init?.method).toBe('PATCH');
	});
});

describe('del', () => {
	it('makes a DELETE request', async () => {
		mockFetch(makeFetchResponse(null, 204));

		await del('/setups/1');

		const [, init] = vi.mocked(fetch).mock.calls[0]!;
		expect(init?.method).toBe('DELETE');
	});
});

describe('auth injection', () => {
	it('attaches Authorization header when token is present', async () => {
		setConfig({ token: 'my-secret-token' });
		mockFetch(makeFetchResponse({ data: null }));

		await get('/setups');

		const [, init] = vi.mocked(fetch).mock.calls[0]!;
		expect((init?.headers as Record<string, string>)['Authorization']).toBe(
			'Bearer my-secret-token'
		);
	});

	it('omits Authorization header when token is missing', async () => {
		// clearConfig already called in beforeEach — no token set
		mockFetch(makeFetchResponse({ data: null }));

		await get('/setups');

		const [, init] = vi.mocked(fetch).mock.calls[0]!;
		expect((init?.headers as Record<string, string>)['Authorization']).toBeUndefined();
	});
});

describe('error responses', () => {
	it('throws ApiError with message, code, and status on non-2xx', async () => {
		mockFetch(makeFetchResponse({ error: 'Setup not found', code: 'NOT_FOUND' }, 404));

		await expect(get('/setups/missing')).rejects.toMatchObject({
			message: 'Setup not found',
			code: 'NOT_FOUND',
			status: 404
		});
	});

	it('throws ApiError with UNKNOWN code when error body has no code', async () => {
		mockFetch(makeFetchResponse({ error: 'Server exploded' }, 500));

		const err = await get('/setups').catch((e) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.code).toBe('UNKNOWN');
		expect(err.status).toBe(500);
	});

	it('throws ApiError with fallback message when body is not JSON', async () => {
		const badResponse = {
			ok: false,
			status: 502,
			json: () => Promise.reject(new SyntaxError('not json')),
			headers: { get: () => null }
		} as unknown as Response;
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(badResponse));

		const err = await get('/setups').catch((e) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err.message).toMatch(/502/);
		expect(err.status).toBe(502);
	});
});

describe('custom apiBase', () => {
	it('uses the provided apiBase override instead of config default', async () => {
		mockFetch(makeFetchResponse({ data: [] }));

		await get('/setups', { apiBase: 'http://localhost:3000/api/v1' });

		const [url] = vi.mocked(fetch).mock.calls[0]!;
		expect(url).toBe('http://localhost:3000/api/v1/setups');
	});
});

describe('network failure', () => {
	it('re-throws network errors with a clear human-readable message', async () => {
		mockFetchReject(new TypeError('Failed to fetch'));

		const err = await get('/setups').catch((e) => e);
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toMatch(/Network error/);
		expect(err.message).toMatch(/coati\.sh/);
	});
});
