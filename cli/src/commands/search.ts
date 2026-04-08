import { Command } from 'commander';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';
import { type CommandContext, ApiError } from '../context.js';

interface SetupSearchResult {
	id: string;
	name: string;
	slug: string;
	description: string;
	ownerUsername: string;
	starsCount: number;
	clonesCount: number;
	agents?: string[];
}

interface SearchOptions {
	json?: boolean;
	agent?: string;
}

function formatAgents(agents: string[] | undefined): string {
	if (!agents || agents.length === 0) return '';
	return agents.map((slug) => AGENTS_BY_SLUG[slug]?.displayName ?? slug).join(', ');
}

export function registerSearch(program: Command, ctx: CommandContext): void {
	program
		.command('search')
		.description('Search for setups on Coati')
		.argument('[query]', 'Search query')
		.option('--agent <slug>', 'Filter results by agent slug (e.g. claude-code)')
		.option('--json', 'Output results as JSON')
		.action(async (query: string | undefined, opts: SearchOptions) => {
			if (opts.json) {
				ctx.io.setOutputMode('json');
			}

			const params = new URLSearchParams();
			if (query) params.set('q', query);
			if (opts.agent) params.set('agent', opts.agent);

			const qs = params.toString();
			const path = `/setups${qs ? `?${qs}` : ''}`;

			let results: SetupSearchResult[];
			try {
				results = await ctx.api.get<SetupSearchResult[]>(path);
			} catch (err_) {
				if (err_ instanceof ApiError) {
					ctx.io.error(`Search failed: ${err_.message}`);
				} else if (err_ instanceof Error) {
					ctx.io.error(`Search failed: ${err_.message}`);
				} else {
					ctx.io.error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			if (ctx.io.isJson()) {
				ctx.io.json(results);
				return;
			}

			if (results.length === 0) {
				ctx.io.info('No setups found.');
				return;
			}

			for (const setup of results) {
				const agentStr = formatAgents(setup.agents);
				ctx.io.print(
					`${setup.ownerUsername}/${setup.slug}  ★ ${setup.starsCount}  ↓ ${setup.clonesCount}`
				);
				if (setup.description) {
					ctx.io.print(`  ${setup.description}`);
				}
				if (agentStr) {
					ctx.io.print(`  Agents: ${agentStr}`);
				}
				ctx.io.print('');
			}
		});
}
