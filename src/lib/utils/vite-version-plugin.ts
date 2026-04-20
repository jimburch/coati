import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export function versionPlugin() {
	return {
		name: 'coati-version',
		config() {
			const pkgPath = resolve(process.cwd(), 'package.json');
			let version = '0.0.0';
			if (existsSync(pkgPath)) {
				try {
					const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
					if (typeof pkg.version === 'string') version = pkg.version;
				} catch {
					// fall through to default
				}
			}
			return {
				define: {
					__APP_VERSION__: JSON.stringify(version)
				}
			};
		}
	};
}
