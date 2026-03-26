import { Command } from 'commander';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';
import { type CommandContext, ApiError } from '../context.js';

interface SetupFileRecord {
	id: string;
	source: string;
	target: string;
	placement: string;
	componentType?: string;
	description?: string;
	agent?: string;
}

interface SetupDetail {
	id: string;
	name: string;
	slug: string;
	description: string;
	ownerUsername: string;
	starsCount: number;
	clonesCount: number;
	postInstall?: string | null;
	agents?: string[];
	tags?: string[];
	createdAt?: string;
	updatedAt?: string;
}

interface ViewOptions {
	json?: boolean;
}

export function registerView(program: Command, ctx: CommandContext): void {
	program
		.command('view')
		.description('View details of a setup')
		.argument('<owner/slug>', 'Setup identifier (e.g. alice/my-setup)')
		.option('--json', 'Output results as JSON')
		.action(async (ownerSlug: string, opts: ViewOptions) => {
			if (opts.json) {
				ctx.io.setOutputMode('json');
			}

			const slashIdx = ownerSlug.indexOf('/');
			if (slashIdx <= 0 || slashIdx === ownerSlug.length - 1) {
				ctx.io.error('Invalid format. Expected: <owner>/<slug> (e.g. alice/my-setup)');
				process.exit(1);
			}
			const owner = ownerSlug.slice(0, slashIdx);
			const slug = ownerSlug.slice(slashIdx + 1);

			let setup: SetupDetail;
			try {
				setup = await ctx.api.get<SetupDetail>(`/setups/${owner}/${slug}`);
			} catch (err_) {
				if (err_ instanceof ApiError && err_.status === 404) {
					ctx.io.error(`Setup "${owner}/${slug}" not found.`);
				} else if (err_ instanceof Error) {
					ctx.io.error(`Failed to fetch setup: ${err_.message}`);
				} else {
					ctx.io.error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			let files: SetupFileRecord[];
			try {
				files = await ctx.api.get<SetupFileRecord[]>(`/setups/${owner}/${slug}/files`);
			} catch (err_) {
				if (err_ instanceof Error) {
					ctx.io.error(`Failed to fetch setup files: ${err_.message}`);
				} else {
					ctx.io.error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			if (ctx.io.isJson()) {
				ctx.io.json({ setup, files });
				return;
			}

			// Header
			ctx.io.print(`${setup.ownerUsername}/${setup.slug}`);
			ctx.io.print(`  ${setup.name}`);
			if (setup.description) {
				ctx.io.print(`  ${setup.description}`);
			}
			ctx.io.print('');

			// Stats
			ctx.io.print(`  ★ ${setup.starsCount} stars  ↓ ${setup.clonesCount} clones`);

			// Tags
			if (setup.tags && setup.tags.length > 0) {
				ctx.io.print(`  Tags: ${setup.tags.join(', ')}`);
			}

			// Agents with per-agent file counts
			const setupAgents = setup.agents ?? [];
			if (setupAgents.length > 0) {
				// Count files per agent
				const agentFileCounts: Record<string, number> = {};
				let sharedCount = 0;

				for (const file of files) {
					if (file.agent) {
						agentFileCounts[file.agent] = (agentFileCounts[file.agent] ?? 0) + 1;
					} else {
						sharedCount++;
					}
				}

				const parts: string[] = setupAgents.map((agentSlug) => {
					const displayName = AGENTS_BY_SLUG[agentSlug]?.displayName ?? agentSlug;
					const count = agentFileCounts[agentSlug] ?? 0;
					return `${displayName}: ${count} ${count === 1 ? 'file' : 'files'}`;
				});

				if (sharedCount > 0) {
					parts.push(`Shared: ${sharedCount} ${sharedCount === 1 ? 'file' : 'files'}`);
				}

				ctx.io.print(`  Agents: ${parts.join(', ')}`);
			}

			// Post-install
			if (setup.postInstall) {
				ctx.io.print(`  Post-install: ${setup.postInstall}`);
			}

			ctx.io.print('');

			// Files list
			if (files.length === 0) {
				ctx.io.info('No files in this setup.');
			} else {
				ctx.io.print(`  Files (${files.length}):`);
				for (const file of files) {
					const agentLabel = file.agent
						? ` [${AGENTS_BY_SLUG[file.agent]?.displayName ?? file.agent}]`
						: '';
					ctx.io.print(`    ${file.source}${agentLabel}`);
				}
			}
		});
}
