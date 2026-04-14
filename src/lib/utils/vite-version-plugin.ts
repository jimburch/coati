import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseLatestVersion } from './version';

export function versionPlugin() {
	return {
		name: 'coati-version',
		config() {
			const changelog = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf-8');
			const version = parseLatestVersion(changelog) ?? '0.0.0';
			return {
				define: {
					__APP_VERSION__: JSON.stringify(version)
				}
			};
		}
	};
}
