import { post, get } from './api.js';
import { getConfig, setConfig, clearConfig } from './config.js';

export interface DeviceCodeResponse {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	expiresIn: number;
	interval: number;
}

export interface PollResult {
	token: string;
	username: string;
}

/** Request a new device code from the server to begin GitHub Device Flow. */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
	return post<DeviceCodeResponse>('/auth/device', {});
}

/**
 * Poll the server until the user authorises the device or the code expires.
 *
 * - On `slow_down` (HTTP 429): increases interval by 5 s.
 * - On transient network errors: silently retries up to 3 times.
 * - On expiry (server 410 or local deadline): throws a clear error.
 */
export async function pollForToken(
	deviceCode: string,
	interval: number,
	expiresIn: number
): Promise<PollResult> {
	const deadline = Date.now() + expiresIn * 1000;
	let currentInterval = interval;

	while (true) {
		if (Date.now() >= deadline) {
			throw new Error('Device code expired. Please run `coati login` again.');
		}

		await sleep(currentInterval * 1000);

		let networkRetries = 0;

		// Inner loop handles transient retries without extra outer-loop delay.
		while (true) {
			try {
				const result = await post<{ status?: string; token?: string; username?: string }>(
					'/auth/device/poll',
					{ deviceCode }
				);

				if (result.token && result.username) {
					return { token: result.token, username: result.username };
				}

				// status === 'pending' or unexpected shape — wait and try again
				break;
			} catch (err) {
				// slow_down: server wants us to back off
				if (isApiErrorWithStatus(err, 429)) {
					currentInterval += 5;
					break;
				}

				// Server-side expiry
				if (isApiErrorWithCode(err, 'EXPIRED')) {
					throw new Error('Device code expired. Please run `coati login` again.');
				}

				// Transient network error — silent retry (up to 3 times)
				if (networkRetries < 3 && isTransientNetworkError(err)) {
					networkRetries++;
					continue;
				}

				// Non-recoverable: rethrow
				throw err;
			}
		}
	}
}

/**
 * Fetch the stored user's profile to confirm the token works end-to-end.
 * Returns the username on success.
 */
export async function verifyToken(): Promise<string> {
	const config = getConfig();
	if (!config.token || !config.username) {
		throw new Error('Not logged in');
	}
	await get<unknown>(`/users/${config.username}`);
	return config.username;
}

/**
 * Invalidate the session on the server (best-effort — errors are swallowed).
 */
export async function serverLogout(): Promise<void> {
	try {
		await post<unknown>('/auth/logout', {});
	} catch {
		// Swallow — logout is best-effort
	}
}

/** Persist token and username to the local config file. */
export function storeCredentials(token: string, username: string): void {
	setConfig({ token, username });
}

/** Remove stored credentials from the local config file. */
export function clearCredentials(): void {
	clearConfig();
}

/** Return true if a token is currently stored in the local config. */
export function isLoggedIn(): boolean {
	return !!getConfig().token;
}

// ── private helpers ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isApiErrorWithStatus(err: unknown, status: number): boolean {
	return err instanceof Error && (err as { status?: number }).status === status;
}

function isApiErrorWithCode(err: unknown, code: string): boolean {
	return err instanceof Error && (err as { code?: string }).code === code;
}

function isTransientNetworkError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const msg = err.message;
	return (
		msg.startsWith('Network error:') ||
		msg.includes('ECONNRESET') ||
		msg.includes('ETIMEDOUT') ||
		msg.includes('ENOTFOUND')
	);
}
