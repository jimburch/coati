import { Command } from 'commander';
import { isLoggedIn, serverLogout, clearCredentials } from '../auth.js';
import { setOutputMode, isJsonMode, json, print, success } from '../output.js';
import { configDir } from '../config.js';
import path from 'path';

interface LogoutOptions {
	json?: boolean;
}

export function registerLogout(program: Command): void {
	program
		.command('logout')
		.description('Remove stored credentials')
		.option('--json', 'Output structured JSON')
		.action(async (options: LogoutOptions) => {
			if (options.json) {
				setOutputMode('json');
			}

			// Step 1: Check if logged in
			if (!isLoggedIn()) {
				if (isJsonMode()) {
					json({ loggedIn: false, message: 'Not logged in' });
				} else {
					print('Not logged in.');
				}
				process.exit(0);
			}

			// Step 2: Best-effort server session invalidation
			try {
				await serverLogout();
			} catch {
				// Swallow — logout is best-effort
			}

			// Step 3: Clear local credentials
			clearCredentials();

			// Step 4: Print confirmation
			const configPath = path.join(configDir, 'config.json');
			if (isJsonMode()) {
				json({ success: true, message: `Logged out. Token removed from ${configPath}` });
			} else {
				success(`Logged out. Token removed from ${configPath}`);
			}
		});
}
