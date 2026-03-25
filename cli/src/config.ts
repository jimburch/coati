import fs from 'fs';
import os from 'os';
import path from 'path';

export interface Config {
	token?: string;
	apiBase: string;
	username?: string;
}

const DEFAULT_CONFIG: Config = {
	apiBase: 'https://coati.sh/api/v1'
};

/** The config directory. Centralised here so it's easy to rename the product. */
export let configDir = path.join(os.homedir(), '.coati');

/**
 * Override the config directory. Intended for tests only — pass a temp dir
 * so tests never touch the real ~/.coati directory.
 */
export function setConfigDir(dir: string): void {
	configDir = dir;
}

function configFilePath(): string {
	return path.join(configDir, 'config.json');
}

/** Read the config file and return its contents merged with defaults. */
export function getConfig(): Config {
	try {
		const raw = fs.readFileSync(configFilePath(), 'utf-8');
		return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<Config>) };
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

/**
 * Merge `partial` into the existing config and persist it.
 *
 * - Creates ~/.coati/ on first write.
 * - Writes atomically via a temp file + fs.rename.
 * - Sets file permissions to 0o600.
 */
export function setConfig(partial: Partial<Config>): void {
	const dir = configDir;
	fs.mkdirSync(dir, { recursive: true });

	const updated = { ...getConfig(), ...partial };
	const filePath = configFilePath();
	const tmpPath = filePath + '.tmp';

	fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 2), {
		encoding: 'utf-8',
		mode: 0o600
	});
	fs.renameSync(tmpPath, filePath);
	// Explicitly chmod in case the process umask widened permissions.
	fs.chmodSync(filePath, 0o600);
}

/** Remove the config file. Does nothing if it doesn't exist. */
export function clearConfig(): void {
	try {
		fs.unlinkSync(configFilePath());
	} catch {
		// Ignore ENOENT — clearing a non-existent config is a no-op.
	}
}
