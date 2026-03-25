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
import { setApiBaseOverride, isNonProductionApi, getEffectiveApiBase } from './api.js';

const DEV_API_BASE = 'http://localhost:5173/api/v1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require(join(__dirname, '../package.json')) as { version: string };

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
		setApiBaseOverride(opts.apiBase);
	} else if (opts.dev) {
		setApiBaseOverride(DEV_API_BASE);
	}

	if (isNonProductionApi()) {
		process.stderr.write(`⚠ dev mode → ${getEffectiveApiBase()}\n`);
	}
});

registerLogin(program);
registerLogout(program);
registerClone(program);
registerInit(program);
registerPublish(program);
registerSearch(program);
registerView(program);

program.parse(process.argv);
