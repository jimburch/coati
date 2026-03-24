import { Command } from 'commander';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { registerLogin } from './commands/login.js';
import { registerLogout } from './commands/logout.js';
import { registerClone } from './commands/clone.js';
import { registerInit } from './commands/init.js';
import { registerPublish } from './commands/publish.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require(join(__dirname, '../package.json')) as { version: string };

const program = new Command();

program
	.name('magpie')
	.description('Magpie CLI — clone, publish, and manage AI coding setups')
	.version(pkg.version);

registerLogin(program);
registerLogout(program);
registerClone(program);
registerInit(program);
registerPublish(program);

program.parse(process.argv);
