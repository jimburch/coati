import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { versionPlugin } from './vite-version-plugin';

vi.mock('fs', () => ({
	readFileSync: vi.fn(),
	existsSync: vi.fn()
}));

describe('versionPlugin', () => {
	it('returns a Vite plugin with __APP_VERSION__ defined from CHANGELOG.md', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(
			'# [2.0.0](https://github.com/jimburch/coati/compare/v1.1.0...v2.0.0) (2026-05-01)\n'
		);

		const plugin = versionPlugin();
		expect(plugin.name).toBe('coati-version');

		const config = (plugin.config as () => { define: Record<string, string> })();
		expect(config.define['__APP_VERSION__']).toBe(JSON.stringify('2.0.0'));
	});

	it('falls back to "0.0.0" when changelog cannot be parsed', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('not a changelog');

		const plugin = versionPlugin();
		const config = (plugin.config as () => { define: Record<string, string> })();
		expect(config.define['__APP_VERSION__']).toBe(JSON.stringify('0.0.0'));
	});
});
