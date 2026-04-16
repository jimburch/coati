import * as Sentry from '@sentry/node';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getConfig } from './config.js';
import { getEffectiveApiBase } from './api.js';

const CLI_SENTRY_DSN =
	'https://2674d0080ed31265fb67f1a5414bc096@o4511222630907904.ingest.us.sentry.io/4511225534349312';

// Guard against double-initialisation (e.g. when called multiple times in the same process).
let initialized = false;

/** Reset initialisation state. Intended for tests only. */
export function resetForTesting(): void {
	initialized = false;
}

function deriveEnvironment(): 'staging' | 'production' {
	const apiBase = getEffectiveApiBase();
	if (apiBase.includes('develop.coati.sh')) return 'staging';
	return 'production';
}

function readCliVersion(): string {
	try {
		const __dirname = dirname(fileURLToPath(import.meta.url));
		const require = createRequire(import.meta.url);
		const pkg = require(join(__dirname, '../package.json')) as { version: string };
		return pkg.version;
	} catch {
		return 'unknown';
	}
}

/**
 * Initialise Sentry crash reporting for the CLI.
 *
 * Opt-out hierarchy (first match wins):
 *   1. DO_NOT_TRACK=1 environment variable
 *   2. COATI_TELEMETRY=false environment variable
 *   3. telemetry: false in ~/.coati/config.json
 *
 * Only unhandled exceptions and rejections are captured — no analytics events.
 */
export function initCliCrashReporting(): void {
	if (initialized) return;

	// 1. Respect the universal DO_NOT_TRACK standard
	if (process.env.DO_NOT_TRACK === '1') return;

	// 2. Respect the Coati-specific telemetry opt-out env var
	if (process.env.COATI_TELEMETRY === 'false') return;

	// 3. Respect the config file opt-out flag
	const config = getConfig();
	if (config.telemetry === false) return;

	const version = readCliVersion();
	const environment = deriveEnvironment();

	initialized = true;

	Sentry.init({
		dsn: CLI_SENTRY_DSN,
		environment,
		release: `coati-cli@${version}`,
		sendDefaultPii: false,
		// No console breadcrumbs, minimal integrations
		integrations: [],
		defaultIntegrations: false
	});

	process.on('uncaughtException', (err: Error) => {
		Sentry.captureException(err);
		void Sentry.flush(2000).finally(() => process.exit(1));
	});

	process.on('unhandledRejection', (reason: unknown) => {
		Sentry.captureException(reason);
		void Sentry.flush(2000).finally(() => process.exit(1));
	});
}
