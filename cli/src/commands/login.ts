import { Command } from 'commander';
import pc from 'picocolors';
import {
	requestDeviceCode,
	pollForToken,
	verifyToken,
	storeCredentials,
	isLoggedIn
} from '../auth.js';
import { setOutputMode, isJsonMode, json, print, success, error } from '../output.js';

const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

interface Spinner {
	stop(): void;
}

function createSpinner(message: string): Spinner {
	if (isJsonMode()) {
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

export function registerLogin(program: Command): void {
	program
		.command('login')
		.description('Authenticate with Coati using GitHub Device Flow')
		.option('--force', 'Re-authenticate even if already logged in')
		.option('--no-browser', 'Do not auto-open the browser')
		.option('--json', 'Output structured JSON')
		.action(async (options: LoginOptions) => {
			if (options.json) {
				setOutputMode('json');
			}

			// Block if already logged in (unless --force)
			if (isLoggedIn() && !options.force) {
				error('Already logged in. Use --force to re-authenticate.');
				process.exit(1);
			}

			// Step 1: Request device code
			let deviceInfo: Awaited<ReturnType<typeof requestDeviceCode>>;
			try {
				deviceInfo = await requestDeviceCode();
			} catch (err) {
				error(err instanceof Error ? err.message : 'Failed to start device flow');
				process.exit(1);
			}

			// Step 2: Show user code + verification URL
			if (isJsonMode()) {
				json({
					userCode: deviceInfo.userCode,
					verificationUri: deviceInfo.verificationUri
				});
			} else {
				print('');
				print(`  Open: ${pc.bold(deviceInfo.verificationUri)}`);
				print(`  Code: ${pc.bold(pc.yellow(deviceInfo.userCode))}`);
				print('');
			}

			// Step 3: Auto-open browser (unless --no-browser)
			if (options.browser !== false) {
				try {
					const { default: open } = await import('open');
					await open(deviceInfo.verificationUri);
				} catch {
					// Silently ignore browser open failures
				}
			}

			// Step 4: Poll with spinner
			const spinner = createSpinner('Waiting for authorization...');

			let token: string;
			let username: string;
			try {
				const result = await pollForToken(
					deviceInfo.deviceCode,
					deviceInfo.interval,
					deviceInfo.expiresIn
				);
				token = result.token;
				username = result.username;
			} catch (err) {
				spinner.stop();
				error(err instanceof Error ? err.message : 'Authorization failed');
				process.exit(1);
			}

			spinner.stop();

			// Step 5: Store credentials
			storeCredentials(token, username);

			// Step 6: Verify token (non-fatal if it fails)
			try {
				await verifyToken();
			} catch {
				// Credentials are stored; verification failure is non-fatal
			}

			// Step 7: Print success
			if (isJsonMode()) {
				json({ success: true, username });
			} else {
				success(`Logged in as ${pc.bold(username)}`);
			}
		});
}
