import { Command } from 'commander';
import pc from 'picocolors';
import type { CommandContext } from '../context.js';

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface Spinner {
	stop(): void;
}

function createSpinner(message: string, isJson: boolean): Spinner {
	if (isJson) {
		return { stop: () => {} };
	}

	let frameIdx = 0;
	const timer = setInterval(() => {
		const frame = BRAILLE_FRAMES[frameIdx % BRAILLE_FRAMES.length]!;
		process.stderr.write(`\r${pc.cyan(frame)} ${message}`);
		frameIdx++;
	}, 80);

	return {
		stop() {
			clearInterval(timer);
			process.stderr.write('\r\x1b[K'); // clear the spinner line
		}
	};
}

interface LoginOptions {
	force?: boolean;
	browser: boolean; // commander --no-browser sets this to false
	json?: boolean;
}

/**
 * Run the interactive login flow (GitHub Device Flow).
 * Can be called from the login command or from other commands that need auth.
 * Returns the username on success, or exits the process on failure.
 */
export async function runLoginFlow(
	ctx: CommandContext,
	options: { browser?: boolean } = {}
): Promise<string> {
	// Step 1: Request device code
	let deviceInfo: Awaited<ReturnType<typeof ctx.auth.requestDeviceCode>>;
	try {
		deviceInfo = await ctx.auth.requestDeviceCode();
	} catch (err) {
		ctx.io.error(err instanceof Error ? err.message : 'Failed to start device flow');
		process.exit(1);
	}

	// Step 2: Show user code + verification URL
	if (ctx.io.isJson()) {
		ctx.io.json({
			userCode: deviceInfo.userCode,
			verificationUri: deviceInfo.verificationUri
		});
	} else {
		ctx.io.print('');
		ctx.io.print(`  Open: ${pc.bold(deviceInfo.verificationUri)}`);
		ctx.io.print(`  Code: ${pc.bold(pc.yellow(deviceInfo.userCode))}`);
		ctx.io.print('');
	}

	// Step 3: Auto-open browser
	if (options.browser !== false) {
		try {
			const { default: open } = await import('open');
			await open(deviceInfo.verificationUri);
		} catch {
			// Silently ignore browser open failures
		}
	}

	// Step 4: Poll with spinner
	const spinner = createSpinner('Waiting for authorization...', ctx.io.isJson());

	let token: string;
	let username: string;
	try {
		const result = await ctx.auth.pollForToken(
			deviceInfo.deviceCode,
			deviceInfo.interval,
			deviceInfo.expiresIn
		);
		token = result.token;
		username = result.username;
	} catch (err) {
		spinner.stop();
		ctx.io.error(err instanceof Error ? err.message : 'Authorization failed');
		process.exit(1);
	}

	spinner.stop();

	// Step 5: Store credentials
	ctx.auth.storeCredentials(token, username);

	// Step 6: Verify token (non-fatal if it fails)
	try {
		await ctx.auth.verifyToken();
	} catch {
		// Credentials are stored; verification failure is non-fatal
	}

	// Step 7: Print success
	if (ctx.io.isJson()) {
		ctx.io.json({ success: true, username });
	} else {
		ctx.io.success(`Logged in as ${pc.bold(username)}`);
	}

	return username;
}

export function registerLogin(program: Command, ctx: CommandContext): void {
	program
		.command('login')
		.description('Authenticate with Coati using GitHub Device Flow')
		.option('--force', 'Re-authenticate even if already logged in')
		.option('--no-browser', 'Do not auto-open the browser')
		.option('--json', 'Output structured JSON')
		.action(async (options: LoginOptions) => {
			if (options.json) {
				ctx.io.setOutputMode('json');
			}

			// Block if already logged in (unless --force)
			if (ctx.auth.isLoggedIn() && !options.force) {
				ctx.io.error('Already logged in. Use --force to re-authenticate.');
				process.exit(1);
			}

			await runLoginFlow(ctx, { browser: options.browser });
		});
}
