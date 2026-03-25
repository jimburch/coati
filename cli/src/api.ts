import { getConfig } from './config.js';

const VERSION = '0.1.0';
const USER_AGENT = `@coati/cli/${VERSION}`;

const PRODUCTION_API_BASE = 'https://coati.sh/api/v1';

/** Module-level override set by CLI flags (--dev, --api-base). */
let apiBaseOverride: string | undefined;

/** Set the API base URL override. Called from index.ts after resolving CLI flags. */
export function setApiBaseOverride(url: string): void {
	apiBaseOverride = url;
}

/** Resolve the effective API base URL using the precedence chain. */
export function getEffectiveApiBase(perCallOverride?: string): string {
	return (
		perCallOverride ??
		apiBaseOverride ??
		process.env.COATI_API_BASE ??
		getConfig().apiBase ??
		PRODUCTION_API_BASE
	);
}

/** Returns true if the effective API base differs from the production default. */
export function isNonProductionApi(): boolean {
	return getEffectiveApiBase() !== PRODUCTION_API_BASE;
}

export class ApiError extends Error {
	code: string;
	status: number;

	constructor(message: string, code: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.code = code;
		this.status = status;
	}
}

export interface ApiClientOptions {
	apiBase?: string;
}

async function request<T>(
	method: string,
	path: string,
	body: unknown,
	options: ApiClientOptions
): Promise<T> {
	const base = getEffectiveApiBase(options.apiBase);
	const url = `${base}${path}`;

	const headers: Record<string, string> = {
		'User-Agent': USER_AGENT
	};

	const { token } = getConfig();
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	if (body !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers,
			body: body !== undefined ? JSON.stringify(body) : undefined
		});
	} catch {
		throw new Error(`Network error: unable to reach ${url}. Check your connection.`);
	}

	if (!response.ok) {
		let errBody: { error?: string; code?: string } = {};
		try {
			errBody = (await response.json()) as { error?: string; code?: string };
		} catch {
			// ignore parse errors — fall through to defaults
		}
		throw new ApiError(
			errBody.error ?? `Request failed with status ${response.status}`,
			errBody.code ?? 'UNKNOWN',
			response.status
		);
	}

	if (response.status === 204) {
		return undefined as unknown as T;
	}

	const json = (await response.json()) as { data: T };
	return json.data;
}

export function get<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
	return request<T>('GET', path, undefined, options);
}

export function post<T>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
	return request<T>('POST', path, body, options);
}

export function patch<T>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
	return request<T>('PATCH', path, body, options);
}

export function del(path: string, options: ApiClientOptions = {}): Promise<void> {
	return request<void>('DELETE', path, undefined, options);
}
