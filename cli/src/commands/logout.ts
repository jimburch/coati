import { Command } from 'commander';
import type { CommandContext } from '../context.js';

interface LogoutOptions {
	json?: boolean;
}

export function registerLogout(program: Command, ctx: CommandContext): void {
	program
		.command('logout')
		.description('Remove stored credentials')
		.option('--json', 'Output structured JSON')
		.action(async (options: LogoutOptions) => {
			if (options.json) {
				ctx.io.setOutputMode('json');
			}

			// Step 1: Check if logged in
			if (!ctx.auth.isLoggedIn()) {
				if (ctx.io.isJson()) {
					ctx.io.json({ loggedIn: false, message: 'Not logged in' });
				} else {
					ctx.io.print('Not logged in.');
				}
				process.exit(0);
			}

			// Step 2: Best-effort server session invalidation
			try {
				await ctx.auth.serverLogout();
			} catch {
				// Swallow — logout is best-effort
			}

			// Step 3: Clear local credentials
			ctx.auth.clearCredentials();

			// Step 4: Print confirmation
			if (ctx.io.isJson()) {
				ctx.io.json({ success: true, message: 'Logged out.' });
			} else {
				ctx.io.success('Logged out.');
			}
		});
}
