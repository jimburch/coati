import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerLogin } from './commands/login.js';
import { registerLogout } from './commands/logout.js';
import { registerClone } from './commands/clone.js';
import { registerInit } from './commands/init.js';
import { registerPublish } from './commands/publish.js';
import { registerSearch } from './commands/search.js';
import { registerView } from './commands/view.js';
import { isNonProductionApi, getEffectiveApiBase } from './api.js';
import { createContext } from './context.js';
import { printBanner } from './banner.js';

const DEV_API_BASE = 'http://localhost:5173/api/v1';

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
	.option('--api-base <url>', 'Override API base URL');

program.hook('preAction', () => {
	const opts = program.opts<{ dev?: boolean; apiBase?: string }>();

	if (opts.apiBase) {
		process.env.COATI_API_BASE = opts.apiBase;
	} else if (opts.dev) {
		process.env.COATI_API_BASE = DEV_API_BASE;
	}

	if (isNonProductionApi()) {
		process.stderr.write(`⚠ dev mode → ${getEffectiveApiBase()}\n`);
	}
});

registerLogin(program, ctx);
registerLogout(program, ctx);
registerClone(program, ctx);
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
