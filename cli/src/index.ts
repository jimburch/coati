import { initCliCrashReporting } from './observability.js';
// Initialise crash reporting before any other code runs.
initCliCrashReporting();

import { Command, Option } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerLogin } from './commands/login.js';
import { registerLogout } from './commands/logout.js';
import { registerClone } from './commands/clone.js';
import { registerConfig } from './commands/config.js';
import { registerInit } from './commands/init.js';
import { registerPublish } from './commands/publish.js';
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
	.description('Share, discover, and clone AI coding setups')
	.version(pkg.version)
	.addOption(new Option('--dev', `Use local dev server (${DEV_API_BASE})`).hideHelp())
	.addOption(new Option('--staging', `Use test environment (${STAGING_API_BASE})`).hideHelp())
	.addOption(new Option('--api-base <url>', 'Override API base URL').hideHelp());

program.addHelpText(
	'after',
	`
Run \`coati <command> --help\` to see options for a specific command.

Examples:
  $ coati clone username/my-setup     Clone a setup into the current directory
  $ coati init                        Create a coati.json for the current directory
  $ coati publish                     Publish the current directory as a setup
  $ coati login                       Sign in with your GitHub account

Learn more: https://coati.sh`
);

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

registerClone(program, ctx);
registerInit(program, ctx);
registerPublish(program, ctx);
registerLogin(program, ctx);
registerLogout(program, ctx);
registerConfig(program, ctx);

// Hide commands not yet ready for public use from --help output.
const HIDDEN_COMMANDS = new Set(['help', 'config']);
program.configureHelp({
	visibleCommands: (cmd) => {
		return cmd.commands.filter((c) => !HIDDEN_COMMANDS.has(c.name()));
	}
});

// Show banner and help when invoked with no arguments.
if (process.argv.length <= 2) {
	printBanner(pkg.version);
	program.outputHelp();
	process.exit(0);
}

program.parse(process.argv);
