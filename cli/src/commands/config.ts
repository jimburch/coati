import { Command } from 'commander';
import { getConfig, setConfig } from '../config.js';
import type { CommandContext } from '../context.js';

export function registerConfig(program: Command, ctx: CommandContext): void {
	const configCmd = program
		.command('config')
		.description('View and manage Coati CLI configuration');

	configCmd
		.command('set')
		.description('Set a configuration value')
		.argument('<key>', 'Configuration key to set')
		.argument('<value>', 'Value to set')
		.action((key: string, value: string) => {
			switch (key) {
				case 'telemetry': {
					if (value !== 'true' && value !== 'false') {
						ctx.io.error('Value for "telemetry" must be "true" or "false"');
						process.exit(1);
					}
					const telemetry = value === 'true';
					setConfig({ telemetry });
					ctx.io.success(`telemetry set to ${String(telemetry)}`);
					break;
				}
				default: {
					ctx.io.error(`Unknown config key: "${key}". Supported keys: telemetry`);
					process.exit(1);
				}
			}
		});

	configCmd
		.command('get')
		.description('Get a configuration value')
		.argument('<key>', 'Configuration key to get')
		.action((key: string) => {
			const config = getConfig();
			switch (key) {
				case 'telemetry': {
					const val = config.telemetry;
					ctx.io.print(val === undefined ? '(not set)' : String(val));
					break;
				}
				default: {
					ctx.io.error(`Unknown config key: "${key}". Supported keys: telemetry`);
					process.exit(1);
				}
			}
		});
}
