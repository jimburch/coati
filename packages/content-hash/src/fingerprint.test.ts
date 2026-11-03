import { describe, it, expect } from 'vitest';
import { normalizeRemote, repoFingerprint } from './index.js';

describe('normalizeRemote', () => {
	it.each([
		['https with .git', 'https://github.com/a/b.git'],
		['scp-style', 'git@github.com:a/b'],
		['ssh with port and trailing slash', 'ssh://git@github.com:22/a/b/'],
		['scp-style with .git', 'git@github.com:a/b.git'],
		['user info and an upper-case host', 'https://user:secret@GitHub.COM:443/a/b.git/'],
		['git protocol', 'git://github.com/a/b'],
		['a trailing newline from git', 'https://github.com/a/b.git\n']
	])('reduces %s to host/owner/repo', (_label, url) => {
		expect(normalizeRemote(url)).toBe('github.com/a/b');
	});

	it('keeps the case of the path', () => {
		expect(normalizeRemote('https://github.com/JimBurch/Coati.git')).toBe(
			'github.com/JimBurch/Coati'
		);
	});

	it('keeps nested group paths', () => {
		expect(normalizeRemote('git@gitlab.com:org/sub/repo.git')).toBe('gitlab.com/org/sub/repo');
	});
});

describe('repoFingerprint', () => {
	it('is the hex SHA-256 of the normalized remote, a newline and relDir', async () => {
		expect(await repoFingerprint('git@github.com:a/b', '.')).toBe(
			'fa2fdf31eb09b2a0aa39ba82f79202e8b9f845659e3cba211f068fb12bf05959'
		);
		expect(await repoFingerprint('https://github.com/a/b.git', 'packages/x')).toBe(
			'cb4fd63ee45c99137a45bd728e25b4862b508874bac077ba0ba7778712e19d5a'
		);
	});

	it('gives https, scp and ssh forms of one remote the same fingerprint', async () => {
		const prints = await Promise.all(
			['https://github.com/a/b.git', 'git@github.com:a/b', 'ssh://git@github.com:22/a/b/'].map(
				(r) => repoFingerprint(r, '.')
			)
		);
		expect(new Set(prints).size).toBe(1);
	});

	it('separates Setups in different subdirectories of one repo', async () => {
		expect(await repoFingerprint('git@github.com:a/b', 'one')).not.toBe(
			await repoFingerprint('git@github.com:a/b', 'two')
		);
	});

	it.each([
		['the top level as ""', '', '.'],
		['the top level as ./', './', '.'],
		['backslash separators', 'packages\\x', 'packages/x'],
		['a leading ./ and trailing /', './packages/x/', 'packages/x']
	])('normalizes %s in relDir', async (_label, relDir, canonical) => {
		expect(await repoFingerprint('git@github.com:a/b', relDir)).toBe(
			await repoFingerprint('git@github.com:a/b', canonical)
		);
	});
});
