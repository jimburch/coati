import { describe, it, expect } from 'vitest';
import { parseLatestVersion } from './version';

describe('parseLatestVersion', () => {
	it('extracts the version from a standard changelog first line', () => {
		const changelog =
			'# [1.1.0](https://github.com/jimburch/coati/compare/v1.0.3...v1.1.0) (2026-04-09)\n\n### Bug Fixes\n';
		expect(parseLatestVersion(changelog)).toBe('1.1.0');
	});

	it('returns null for malformed content', () => {
		expect(parseLatestVersion('')).toBeNull();
		expect(parseLatestVersion('Just some text')).toBeNull();
		expect(parseLatestVersion('# No version here')).toBeNull();
	});
});
