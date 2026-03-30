import os from 'os';
import path from 'path';
import { Command } from 'commander';
import { AGENTS_BY_SLUG } from '@coati/agents-registry';
import { ApiError } from '../context.js';
import { detectInstalledAgents } from '../agent-detection.js';
import { MANIFEST_FILENAME } from '../manifest.js';
import type { ManifestPlacement } from '../manifest.js';
import type { CommandContext } from '../context.js';

interface SetupMeta {
	id: string;
	name: string;
	slug: string;
	version?: string;
	description: string;
	ownerUsername: string;
	clonesCount: number;
	starsCount: number;
	postInstall?: string | null;
	agents?: string[];
}

interface SetupFileRecord {
	id: string;
	source: string;
	target: string;
	placement: ManifestPlacement;
	content: string;
	componentType?: string;
	description?: string;
	agent?: string;
}

interface CloneOptions {
	json?: boolean;
	dryRun?: boolean;
	force?: boolean;
	pick?: boolean;
	/** false when --no-post-install is passed; true (default) otherwise */
	postInstall?: boolean;
	projectDir?: string;
	dir?: string;
	agent?: string;
}

function isNetworkError(err: Error): boolean {
	const code = (err as NodeJS.ErrnoException).code;
	return (
		code === 'ECONNREFUSED' ||
		code === 'ENOTFOUND' ||
		err.message.toLowerCase().includes('etimedout') ||
		err.message.toLowerCase().includes('timeout')
	);
}

export function registerClone(program: Command, ctx: CommandContext): void {
	program
		.command('clone')
		.description('Clone and install a setup to your local machine')
		.argument('<owner/slug>', 'Setup identifier (e.g. alice/my-setup)')
		.option('--dry-run', 'Preview what would be written without writing anything')
		.option('--force', 'Overwrite all conflicts without prompting')
		.option('--pick', 'Interactively select which files to install')
		.option('--no-post-install', 'Skip post-install commands')
		.option('--dir <path>', 'Override destination directory for project-scoped files')
		.option('--project-dir <path>', 'Project directory for project-scoped files (default: cwd)')
		.option('--agent <slug>', 'Override agent detection and install files for this agent only')
		.option('--json', 'Output results as JSON')
		.action(async (ownerSlug: string, opts: CloneOptions) => {
			if (opts.json) {
				ctx.io.setOutputMode('json');
			}

			// Parse <owner>/<slug> or full URL
			let owner: string;
			let slug: string;

			if (ownerSlug.startsWith('http://') || ownerSlug.startsWith('https://')) {
				let url: URL;
				try {
					url = new URL(ownerSlug);
				} catch {
					ctx.io.error('Invalid URL. Expected format: https://coati.sh/owner/slug or owner/slug');
					process.exit(1);
				}
				const segments = url.pathname.split('/').filter(Boolean);
				if (segments.length !== 2) {
					if (segments.length > 2) {
						ctx.io.error(
							'Invalid URL: extra path segments detected. Expected format: https://coati.sh/owner/slug'
						);
					} else {
						ctx.io.error('Invalid URL. Expected format: https://coati.sh/owner/slug or owner/slug');
					}
					process.exit(1);
				}
				owner = segments[0]!;
				slug = segments[1]!;
			} else {
				const slashIdx = ownerSlug.indexOf('/');
				if (slashIdx <= 0 || slashIdx === ownerSlug.length - 1) {
					ctx.io.error('Invalid format. Expected: <owner>/<slug> (e.g. alice/my-setup)');
					process.exit(1);
				}
				owner = ownerSlug.slice(0, slashIdx);
				slug = ownerSlug.slice(slashIdx + 1);
			}

			// Fetch setup metadata
			let setup: SetupMeta;
			try {
				setup = await ctx.api.get<SetupMeta>(`/setups/${owner}/${slug}`);
			} catch (err) {
				if (err instanceof ApiError && err.status === 404) {
					ctx.io.error(
						`Setup "${owner}/${slug}" not found.\nCheck the owner/slug spelling, or browse setups at https://coati.sh/explore`
					);
				} else if (err instanceof Error && isNetworkError(err)) {
					ctx.io.error('Could not reach the Coati API. Check your internet connection.');
				} else if (err instanceof Error) {
					ctx.io.error(`Failed to fetch setup: ${err.message}`);
				} else {
					ctx.io.error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			// Fetch setup files
			let files: SetupFileRecord[];
			try {
				files = await ctx.api.get<SetupFileRecord[]>(`/setups/${owner}/${slug}/files`);
			} catch (err) {
				if (err instanceof Error) {
					ctx.io.error(`Failed to fetch setup files: ${err.message}`);
				} else {
					ctx.io.error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			if (files.length === 0) {
				ctx.io.warning('This setup has no files to install.');
				if (ctx.io.isJson()) {
					ctx.io.json({
						setup: { owner, slug, name: setup.name },
						files: [],
						written: 0,
						skipped: 0,
						backedUp: 0
					});
				}
				process.exit(0);
			}

			// ── Agent selection ────────────────────────────────────────────────────
			const setupAgents: string[] = setup.agents ?? [];

			if (opts.agent) {
				// --agent flag overrides auto-detection entirely
				if (setupAgents.length > 0 && !setupAgents.includes(opts.agent)) {
					ctx.io.warning(
						`Agent "${opts.agent}" is not listed in this setup's supported agents (${setupAgents.join(', ')}).`
					);
				}
				files = files.filter((f) => !f.agent || f.agent === opts.agent);
			} else if (!ctx.io.isJson() && setupAgents.length > 0) {
				const detected = detectInstalledAgents(setupAgents);

				let selectedAgent: string;
				if (detected.length === 1) {
					// Single match — auto-select without prompting
					selectedAgent = detected[0]!;
					const displayName = AGENTS_BY_SLUG[selectedAgent]?.displayName ?? selectedAgent;
					ctx.io.info(`Auto-detected ${displayName}. Installing files for ${displayName}.`);
				} else {
					// Multiple matches or zero matches → prompt user to choose
					const supportedNames = setupAgents
						.map((s) => AGENTS_BY_SLUG[s]?.displayName ?? s)
						.join(', ');
					ctx.io.print(`\nThis setup supports: ${supportedNames}`);
					if (detected.length === 0) {
						ctx.io.info('No supported agents detected on your machine.');
					}
					const candidates = detected.length > 1 ? detected : setupAgents;
					const agentChoices = candidates.map((s) => ({
						slug: s,
						displayName: AGENTS_BY_SLUG[s]?.displayName ?? s
					}));
					selectedAgent = await ctx.io.promptAgentSelection(agentChoices);
				}

				files = files.filter((f) => !f.agent || f.agent === selectedAgent);
			}
			// If setupAgents is empty (no agents declared) and no --agent flag,
			// all files are installed (no agent filtering).

			// --pick: interactive file selection (skip in JSON mode — use all files)
			if (opts.pick && !ctx.io.isJson()) {
				const selectedIndices = await ctx.io.pickFiles(files);
				if (selectedIndices.length === 0) {
					ctx.io.warning('No files selected. Nothing to install.');
					process.exit(0);
				}
				files = selectedIndices.map((i) => files[i]!);
			}

			// Resolve project directory
			// --dir bypasses the destination prompt and directly sets projectDir
			let projectDir: string;
			let destination: 'current' | 'global' | 'dir' = 'current';

			if (opts.dir) {
				projectDir = path.resolve(opts.dir);
				destination = 'dir';
			} else {
				// Prompt for install scope (interactive only)
				// Default to 'global' when majority of filtered files are globally-scoped.
				const globalCount = files.filter((f) => f.placement === 'global').length;
				const defaultScope: 'current' | 'global' =
					files.length > 0 && globalCount > files.length / 2 ? 'global' : 'current';

				let dest: 'current' | 'global' = 'current';
				if (!ctx.io.isJson()) {
					dest = await ctx.io.promptDestination(defaultScope);
				}
				destination = dest;

				if (dest === 'global') {
					projectDir = path.join(os.homedir(), '.coati', 'setups', owner, slug);
				} else {
					projectDir = opts.projectDir ? path.resolve(opts.projectDir) : process.cwd();
				}
			}

			if (!ctx.io.isJson()) {
				ctx.io.info(`Review setup contents before installing: https://coati.sh/${owner}/${slug}`);
				ctx.io.info('Coati setups are community-contributed and not verified.');
			}

			if (!ctx.io.isJson()) {
				ctx.io.print(`\nCloning ${owner}/${slug} → ${projectDir}\n`);
				if (opts.dryRun) {
					ctx.io.info('Dry run — no files will be written.\n');
				}
			}

			// Write files
			let writeResult;
			try {
				writeResult = await ctx.fs.writeSetupFiles(files, {
					projectDir,
					destination,
					force: opts.force,
					dryRun: opts.dryRun
				});
			} catch (err) {
				if (err instanceof Error) {
					ctx.io.error(`Failed to write files: ${err.message}`);
				} else {
					ctx.io.error('An unexpected error occurred while writing files.');
				}
				process.exit(1);
			}

			// Record clone event — best-effort, never fail the whole operation
			if (!opts.dryRun) {
				try {
					await ctx.api.post(`/setups/${owner}/${slug}/clone`, {});
				} catch {
					// Silently ignore — clone tracking is non-critical
				}

				// Write clone-tracking coati.json to the destination directory
				ctx.fs.writeJson(path.join(projectDir, MANIFEST_FILENAME), {
					source: `${owner}/${slug}`,
					clonedAt: new Date().toISOString(),
					revision: setup.version ?? setup.id
				});
			}

			// Post-install execution
			// opts.postInstall is false when --no-post-install is passed; true (default) otherwise
			const shouldRunPostInstall =
				!opts.dryRun &&
				opts.postInstall !== false &&
				!ctx.io.isJson() &&
				setup.postInstall != null &&
				setup.postInstall.trim() !== '';

			let postInstallResult: { ran: boolean; command?: string; output?: string; error?: string } = {
				ran: false
			};

			if (shouldRunPostInstall) {
				const cmd = setup.postInstall!;
				ctx.io.print('');
				ctx.io.info(`Post-install: ${cmd}`);
				const confirmed = await ctx.io.confirmPostInstall(cmd);
				if (confirmed) {
					try {
						const { stdout, stderr } = await ctx.fs.runCommand(cmd, { cwd: projectDir });
						if (stdout) ctx.io.print(stdout.trimEnd());
						if (stderr) ctx.io.print(stderr.trimEnd());
						ctx.io.success('Post-install command completed.');
						postInstallResult = { ran: true, command: cmd, output: stdout };
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err);
						ctx.io.error(`Post-install failed: ${msg}`);
						postInstallResult = { ran: false, command: cmd, error: msg };
					}
				} else {
					ctx.io.info('Post-install skipped.');
					postInstallResult = { ran: false, command: cmd };
				}
			}

			// Output summary
			if (ctx.io.isJson()) {
				ctx.io.json({
					setup: { owner, slug, name: setup.name },
					destination,
					projectDir,
					dryRun: opts.dryRun ?? false,
					written: writeResult.written,
					skipped: writeResult.skipped,
					backedUp: writeResult.backedUp,
					files: writeResult.files,
					postInstall: postInstallResult
				});
			} else {
				ctx.io.print('');

				if (opts.dryRun) {
					ctx.io.success(`Dry run complete: ${writeResult.files.length} file(s) would be written.`);
				} else {
					if (writeResult.written > 0 || writeResult.backedUp > 0) {
						ctx.io.success(`Cloned ${owner}/${slug} successfully.`);
					} else if (writeResult.skipped === writeResult.files.length) {
						ctx.io.warning('All files were skipped — nothing was written.');
					}

					const parts: string[] = [];
					if (writeResult.written > 0) parts.push(`${writeResult.written} written`);
					if (writeResult.backedUp > 0) parts.push(`${writeResult.backedUp} backed up`);
					if (writeResult.skipped > 0) parts.push(`${writeResult.skipped} skipped`);
					if (parts.length > 0) ctx.io.print(`  ${parts.join(', ')}`);
				}

				ctx.io.print('');
				for (const f of writeResult.files) {
					const icon = f.outcome === 'written' ? '✓' : f.outcome === 'backed-up' ? '↻' : '-';
					ctx.io.print(`  ${icon} ${f.target}`);
					if (f.backupPath) {
						ctx.io.print(`    (backup: ${f.backupPath})`);
					}
				}
			}
		});
}
