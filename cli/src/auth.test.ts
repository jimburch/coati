import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearConfig, getConfig, setConfig, setConfigDir } from './config.js';

// ── mock api module ───────────────────────────────────────────────────────────

const mockPost = vi.fn();
const mockGet = vi.fn();

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js');
	return {
		...actual,
		post: mockPost,
		get: mockGet
	};
});

// Import after mock registration
const {
	requestDeviceCode,
	pollForToken,
	verifyToken,
	serverLogout,
	storeCredentials,
	clearCredentials,
	isLoggedIn
} = await import('./auth.js');

// ── helpers ───────────────────────────────────────────────────────────────────

/** Create a lightweight object that looks like an ApiError. */
function makeApiError(message: string, code: string, status: number): Error {
	const err = new Error(message) as Error & { code: string; status: number };
	err.code = code;
	err.status = status;
	return err;
}

function makeNetworkError(message = 'Network error: unable to reach server'): Error {
	return new Error(message);
}

// ── setup / teardown ─────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-auth-test-'));
	setConfigDir(tmpDir);
	clearConfig();
	mockPost.mockReset();
	mockGet.mockReset();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	setConfigDir(path.join(os.homedir(), '.coati'));
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── requestDeviceCode ─────────────────────────────────────────────────────────

describe('requestDeviceCode', () => {
	it('calls POST /auth/device and returns the response', async () => {
		const deviceInfo = {
			deviceCode: 'dc_abc',
			userCode: 'ABCD-1234',
			verificationUri: 'https://github.com/activate',
			expiresIn: 900,
			interval: 5
		};
		mockPost.mockResolvedValueOnce(deviceInfo);

		const result = await requestDeviceCode();

		expect(mockPost).toHaveBeenCalledWith('/auth/device', {});
		expect(result).toEqual(deviceInfo);
	});

	it('propagates errors from the API', async () => {
		mockPost.mockRejectedValueOnce(makeApiError('Device flow error', 'DEVICE_FLOW_ERROR', 502));

		await expect(requestDeviceCode()).rejects.toThrow('Device flow error');
	});
});

// ── pollForToken ──────────────────────────────────────────────────────────────

describe('pollForToken — success', () => {
	it('returns token and username on immediate success', async () => {
		mockPost.mockResolvedValueOnce({ token: 'tok_123', username: 'alice' });

		const promise = pollForToken('dc_abc', 5, 900);
		// Advance past the initial interval sleep (5s)
		await vi.advanceTimersByTimeAsync(5000);
		const result = await promise;

		expect(result).toEqual({ token: 'tok_123', username: 'alice' });
	});
});

describe('pollForToken — pending then success', () => {
	it('continues polling on pending and returns when authorised', async () => {
		// First call: pending; second call: success
		mockPost
			.mockResolvedValueOnce({ status: 'pending' })
			.mockResolvedValueOnce({ token: 'tok_456', username: 'bob' });

		const promise = pollForToken('dc_abc', 5, 900);
		// First interval
		await vi.advanceTimersByTimeAsync(5000);
		// Second interval
		await vi.advanceTimersByTimeAsync(5000);
		const result = await promise;

		expect(result).toEqual({ token: 'tok_456', username: 'bob' });
		expect(mockPost).toHaveBeenCalledTimes(2);
	});
});

describe('pollForToken — slow_down', () => {
	it('adds 5s to interval when server responds with 429', async () => {
		// First: slow_down, second: success
		mockPost
			.mockRejectedValueOnce(makeApiError('slow down', 'UNKNOWN', 429))
			.mockResolvedValueOnce({ token: 'tok_789', username: 'carol' });

		const promise = pollForToken('dc_abc', 5, 900);

		// Advance past initial 5s interval — triggers slow_down
		await vi.advanceTimersByTimeAsync(5000);
		// Now interval is 10s — advance past that
		await vi.advanceTimersByTimeAsync(10000);

		const result = await promise;
		expect(result).toEqual({ token: 'tok_789', username: 'carol' });
	});

	it('correctly accumulates multiple slow_down increments', async () => {
		mockPost
			.mockRejectedValueOnce(makeApiError('slow down', 'UNKNOWN', 429))
			.mockRejectedValueOnce(makeApiError('slow down', 'UNKNOWN', 429))
			.mockResolvedValueOnce({ token: 'tok_aaa', username: 'dave' });

		const promise = pollForToken('dc_abc', 5, 900);

		await vi.advanceTimersByTimeAsync(5000); // first 5s → slow_down, interval becomes 10
		await vi.advanceTimersByTimeAsync(10000); // second 10s → slow_down, interval becomes 15
		await vi.advanceTimersByTimeAsync(15000); // third 15s → success

		const result = await promise;
		expect(result).toEqual({ token: 'tok_aaa', username: 'dave' });
	});
});

describe('pollForToken — expiry', () => {
	it('throws a clear error when server returns 410 EXPIRED', async () => {
		mockPost.mockRejectedValueOnce(makeApiError('Device code expired', 'EXPIRED', 410));

		const promise = pollForToken('dc_abc', 5, 900);
		// Register rejection handler before advancing timers to avoid unhandled rejection warning
		const assertion = expect(promise).rejects.toThrow('Device code expired');
		await vi.advanceTimersByTimeAsync(5000);
		await assertion;
	});

	it('throws suggesting re-run when server returns 410', async () => {
		mockPost.mockRejectedValueOnce(makeApiError('Device code expired', 'EXPIRED', 410));

		const promise = pollForToken('dc_abc', 5, 900);
		const assertion = expect(promise).rejects.toThrow('coati login');
		await vi.advanceTimersByTimeAsync(5000);
		await assertion;
	});

	it('throws a clear error when client-side deadline is reached', async () => {
		// expiresIn = 3 seconds; interval = 5s, so after sleep(5s) deadline (3s) is past
		mockPost.mockResolvedValue({ status: 'pending' });

		const promise = pollForToken('dc_abc', 5, 3);
		const assertion = expect(promise).rejects.toThrow('Device code expired');
		// Advance past the 5s sleep; when the loop checks deadline (3s), it will throw
		await vi.advanceTimersByTimeAsync(5000);
		await assertion;
	});
});

describe('pollForToken — transient network errors', () => {
	it('silently retries up to 3 times on transient errors then succeeds', async () => {
		const networkErr = makeNetworkError();
		mockPost
			.mockRejectedValueOnce(networkErr)
			.mockRejectedValueOnce(networkErr)
			.mockRejectedValueOnce(networkErr)
			.mockResolvedValueOnce({ token: 'tok_net', username: 'eve' });

		const promise = pollForToken('dc_abc', 5, 900);
		await vi.advanceTimersByTimeAsync(5000);

		const result = await promise;
		expect(result).toEqual({ token: 'tok_net', username: 'eve' });
		// 3 transient errors + 1 success = 4 total calls
		expect(mockPost).toHaveBeenCalledTimes(4);
	});

	it('throws after exceeding 3 transient retries', async () => {
		const networkErr = makeNetworkError();
		mockPost
			.mockRejectedValueOnce(networkErr)
			.mockRejectedValueOnce(networkErr)
			.mockRejectedValueOnce(networkErr)
			.mockRejectedValueOnce(networkErr); // 4th rejection exceeds limit

		const promise = pollForToken('dc_abc', 5, 900);
		const assertion = expect(promise).rejects.toThrow('Network error:');
		await vi.advanceTimersByTimeAsync(5000);
		await assertion;
		expect(mockPost).toHaveBeenCalledTimes(4);
	});

	it('does not retry on non-transient API errors', async () => {
		mockPost.mockRejectedValueOnce(makeApiError('Forbidden', 'FORBIDDEN', 403));

		const promise = pollForToken('dc_abc', 5, 900);
		const assertion = expect(promise).rejects.toThrow('Forbidden');
		await vi.advanceTimersByTimeAsync(5000);
		await assertion;
		// Should only have been called once — no retries
		expect(mockPost).toHaveBeenCalledTimes(1);
	});
});

// ── verifyToken ───────────────────────────────────────────────────────────────

describe('verifyToken', () => {
	it('calls GET /users/[username] and returns the username', async () => {
		setConfig({ token: 'tok_verify', username: 'frank' });
		mockGet.mockResolvedValueOnce({ username: 'frank' });

		const username = await verifyToken();

		expect(mockGet).toHaveBeenCalledWith('/users/frank');
		expect(username).toBe('frank');
	});

	it('throws when not logged in', async () => {
		// No token set
		await expect(verifyToken()).rejects.toThrow('Not logged in');
	});

	it('throws when get() rejects', async () => {
		setConfig({ token: 'tok_bad', username: 'grace' });
		mockGet.mockRejectedValueOnce(makeApiError('Unauthorized', 'UNAUTHORIZED', 401));

		await expect(verifyToken()).rejects.toThrow('Unauthorized');
	});
});

// ── serverLogout ──────────────────────────────────────────────────────────────

describe('serverLogout', () => {
	it('calls POST /auth/logout', async () => {
		setConfig({ token: 'tok_logout', username: 'henry' });
		mockPost.mockResolvedValueOnce({ success: true });

		await serverLogout();

		expect(mockPost).toHaveBeenCalledWith('/auth/logout', {});
	});

	it('swallows errors silently (best-effort)', async () => {
		mockPost.mockRejectedValueOnce(makeApiError('Unauthorized', 'UNAUTHORIZED', 401));

		// Should not throw
		await expect(serverLogout()).resolves.toBeUndefined();
	});
});

// ── storeCredentials / clearCredentials / isLoggedIn ─────────────────────────

describe('storeCredentials', () => {
	it('persists token and username to config', () => {
		storeCredentials('tok_store', 'irene');

		const config = getConfig();
		expect(config.token).toBe('tok_store');
		expect(config.username).toBe('irene');
	});
});

describe('clearCredentials', () => {
	it('removes the config file', () => {
		storeCredentials('tok_clear', 'jack');
		clearCredentials();

		const config = getConfig();
		expect(config.token).toBeUndefined();
		expect(config.username).toBeUndefined();
	});

	it('is a no-op when not logged in', () => {
		expect(() => clearCredentials()).not.toThrow();
	});
});

describe('isLoggedIn', () => {
	it('returns false when no token is stored', () => {
		expect(isLoggedIn()).toBe(false);
	});

	it('returns true when a token is stored', () => {
		setConfig({ token: 'tok_check' });
		expect(isLoggedIn()).toBe(true);
	});

	it('returns false after credentials are cleared', () => {
		storeCredentials('tok_was_here', 'kate');
		clearCredentials();
		expect(isLoggedIn()).toBe(false);
	});
});
