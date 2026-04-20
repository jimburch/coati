import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { versionPlugin } from './vite-version-plugin';

vi.mock('fs', () => ({
	readFileSync: vi.fn(),
	existsSync: vi.fn()
}));

describe('versionPlugin', () => {
	it('returns a Vite plugin with __APP_VERSION__ defined from package.json', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ version: '2.0.0' }));

		const plugin = versionPlugin();
		expect(plugin.name).toBe('coati-version');

		const config = (plugin.config as () => { define: Record<string, string> })();
		expect(config.define['__APP_VERSION__']).toBe(JSON.stringify('2.0.0'));
	});

	it('falls back to "0.0.0" when package.json is missing', () => {
		vi.mocked(existsSync).mockReturnValue(false);

		const plugin = versionPlugin();
		const config = (plugin.config as () => { define: Record<string, string> })();
		expect(config.define['__APP_VERSION__']).toBe(JSON.stringify('0.0.0'));
	});

	it('falls back to "0.0.0" when package.json is malformed', () => {
		vi.mocked(existsSync).mockReturnValue(true);
		vi.mocked(readFileSync).mockReturnValue('not valid json');

		const plugin = versionPlugin();
		const config = (plugin.config as () => { define: Record<string, string> })();
		expect(config.define['__APP_VERSION__']).toBe(JSON.stringify('0.0.0'));
	});
});
