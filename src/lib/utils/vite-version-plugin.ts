import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseLatestVersion } from './version';

export function versionPlugin() {
	return {
		name: 'coati-version',
		config() {
			const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');
			const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : '';
			const version = parseLatestVersion(changelog) ?? '0.0.0';
			return {
				define: {
					__APP_VERSION__: JSON.stringify(version)
				}
			};
		}
	};
}
