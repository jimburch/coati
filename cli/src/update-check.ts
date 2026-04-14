import fs from 'fs';
import path from 'path';
import pc from 'picocolors';

export interface UpdateInfo {
	currentVersion: string;
	latestVersion: string;
}

export interface UpdateCheckOptions {
	cacheDir: string;
	/** Injectable fetch function for testing. Defaults to hitting the npm registry. */
	fetchLatestVersion?: () => Promise<string>;
}

interface CacheData {
	lastCheck: number;
	latestVersion: string;
}

const CACHE_FILENAME = 'update-check.json';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function readCache(cacheDir: string): CacheData | null {
	try {
		const raw = fs.readFileSync(path.join(cacheDir, CACHE_FILENAME), 'utf-8');
		return JSON.parse(raw) as CacheData;
	} catch {
		return null;
	}
}

function writeCache(cacheDir: string, data: CacheData): void {
	fs.mkdirSync(cacheDir, { recursive: true });
	fs.writeFileSync(path.join(cacheDir, CACHE_FILENAME), JSON.stringify(data), 'utf-8');
}

async function fetchFromNpm(): Promise<string> {
	const res = await fetch('https://registry.npmjs.org/@coati/sh/latest');
	const json = (await res.json()) as { version: string };
	return json.version;
}

export async function checkForUpdate(
	currentVersion: string,
	options: UpdateCheckOptions
): Promise<UpdateInfo | null> {
	const cache = readCache(options.cacheDir);
	const isFresh = cache && Date.now() - cache.lastCheck < ONE_DAY_MS;

	let latestVersion: string;

	if (isFresh) {
		latestVersion = cache.latestVersion;
	} else {
		const fetchFn = options.fetchLatestVersion ?? fetchFromNpm;
		try {
			latestVersion = await fetchFn();
		} catch {
			return null;
		}
		writeCache(options.cacheDir, { lastCheck: Date.now(), latestVersion });
	}

	if (latestVersion === currentVersion) {
		return null;
	}

	return { currentVersion, latestVersion };
}

export function formatUpdateNotice(current: string, latest: string): string {
	return (
		pc.yellow(`Update available: ${current} → ${latest}`) +
		'\n' +
		pc.dim(`Run \`npm install -g @coati/sh@latest\` to update`)
	);
}
