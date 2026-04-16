import { initCliCrashReporting } from './observability.js';
// Initialise crash reporting before any other code runs.
initCliCrashReporting();

import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerLogin } from './commands/login.js';
import { registerLogout } from './commands/logout.js';
import { registerClone } from './commands/clone.js';
import { registerConfig } from './commands/config.js';
import { registerInit } from './commands/init.js';
import { registerPublish } from './commands/publish.js';
import { registerSearch } from './commands/search.js';
import { registerView } from './commands/view.js';
import { isNonProductionApi, getEffectiveApiBase } from './api.js';
import { createContext } from './context.js';
import { printBanner } from './banner.js';
import { checkForUpdate, formatUpdateNotice } from './update-check.js';
import { configDir } from './config.js';

const DEV_API_BASE = 'http://localhost:5173/api/v1';
const STAGING_API_BASE = 'https://develop.coati.sh/api/v1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require(join(__dirname, '../package.json')) as { version: string };

// Instantiate context once at startup.
const ctx = createContext();

const program = new Command();

program
	.name('coati')
	.description('Coati CLI — clone, publish, and manage AI coding setups')
	.version(pkg.version)
	.option('--dev', `Use local dev server (${DEV_API_BASE})`)
	.option('--staging', `Use test environment (${STAGING_API_BASE})`)
	.option('--api-base <url>', 'Override API base URL');

const BANNER_COMMANDS = new Set(['init', 'clone']);

program.hook('preAction', (_thisCommand, actionCommand) => {
	const opts = program.opts<{ dev?: boolean; staging?: boolean; apiBase?: string }>();

	if (opts.apiBase) {
		process.env.COATI_API_BASE = opts.apiBase;
	} else if (opts.staging) {
		process.env.COATI_API_BASE = STAGING_API_BASE;
	} else if (opts.dev) {
		process.env.COATI_API_BASE = DEV_API_BASE;
	}

	if (isNonProductionApi()) {
		process.stderr.write(`⚠ dev mode → ${getEffectiveApiBase()}\n`);
	}

	// Show ASCII logo on init and clone
	const commandName = actionCommand.name();
	if (BANNER_COMMANDS.has(commandName)) {
		printBanner(pkg.version);
	}
});

program.hook('postAction', async () => {
	const update = await checkForUpdate(pkg.version, { cacheDir: configDir });
	if (update) {
		console.log();
		console.log(formatUpdateNotice(update.currentVersion, update.latestVersion));
	}
});

registerLogin(program, ctx);
registerLogout(program, ctx);
registerClone(program, ctx);
registerConfig(program, ctx);
registerInit(program, ctx);
registerPublish(program, ctx);
registerSearch(program, ctx);
registerView(program, ctx);

// Hide commands not yet ready for public use from --help output.
const HIDDEN_COMMANDS = new Set(['search', 'view', 'help']);
program.configureHelp({
	visibleCommands: (cmd) => {
		return cmd.commands.filter((c) => !HIDDEN_COMMANDS.has(c.name()));
	}
});

// Show banner and help when invoked with no arguments.
if (process.argv.length <= 2) {
	printBanner();
	program.outputHelp();
	process.exit(0);
}

program.parse(process.argv);
