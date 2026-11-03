import { sha256Hex } from './hash.js';

const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCP_STYLE = /^(?:[^@/]+@)?([^:/]+):(.*)$/;

function stripRepoSuffix(path: string): string {
	return path
		.replace(/\/+$/, '')
		.replace(/\.git$/i, '')
		.replace(/\/+$/, '');
}

/**
 * Reduces a git remote URL to `host/path` (spec §3): drops the scheme, user
 * info and port, lowercases the host, and strips a trailing `.git` and `/`.
 * scp-style `git@host:owner/repo` reads as `host/owner/repo`.
 */
export function normalizeRemote(url: string): string {
	const trimmed = url.trim();
	let host: string;
	let path: string;

	if (URL_SCHEME.test(trimmed)) {
		const rest = trimmed.replace(URL_SCHEME, '');
		const slash = rest.indexOf('/');
		const authority = slash === -1 ? rest : rest.slice(0, slash);
		host = authority.replace(/^.*@/, '').replace(/:\d*$/, '');
		path = slash === -1 ? '' : rest.slice(slash);
	} else {
		const scp = SCP_STYLE.exec(trimmed);
		if (!scp) return stripRepoSuffix(trimmed);
		host = scp[1];
		path = scp[2];
	}

	return `${host.toLowerCase()}/${stripRepoSuffix(path.replace(/^\/+/, ''))}`;
}

function normalizeRelDir(relDir: string): string {
	const dir = relDir
		.replace(/\\/g, '/')
		.replace(/^(\.\/)+/, '')
		.replace(/\/+$/, '');
	return dir === '' ? '.' : dir;
}

/**
 * The Repo fingerprint for a Local copy: hex SHA-256 of the normalized `origin`
 * remote, a newline, and the root's directory relative to the repo top level
 * (`.` at the top). Unsalted, so Team Members' clones of one repo agree.
 * The raw remote never leaves the machine; only this hash does.
 */
export function repoFingerprint(remote: string, relDir: string): Promise<string> {
	return sha256Hex(`${normalizeRemote(remote)}\n${normalizeRelDir(relDir)}`);
}
