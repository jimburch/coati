import os from 'os';
import path from 'path';
import { Command } from 'commander';
import { get, post, ApiError } from '../api.js';
import { writeSetupFiles } from '../files.js';
import { promptDestination } from '../prompts.js';
import {
	setOutputMode,
	isJsonMode,
	json,
	print,
	success,
	error,
	warning,
	info
} from '../output.js';
import type { ManifestPlacement } from '../manifest.js';

interface SetupMeta {
	id: string;
	name: string;
	slug: string;
	description: string;
	ownerUsername: string;
	clonesCount: number;
	starsCount: number;
}

interface SetupFileRecord {
	id: string;
	source: string;
	target: string;
	placement: ManifestPlacement;
	content: string;
	componentType?: string;
	description?: string;
}

interface CloneOptions {
	json?: boolean;
	dryRun?: boolean;
	force?: boolean;
	projectDir?: string;
}

export function registerClone(program: Command): void {
	program
		.command('clone')
		.description('Clone and install a setup to your local machine')
		.argument('<owner/slug>', 'Setup identifier (e.g. alice/my-setup)')
		.option('--dry-run', 'Preview what would be written without writing anything')
		.option('--force', 'Overwrite all conflicts without prompting')
		.option('--pick', 'Interactively select which files to install')
		.option('--no-post-install', 'Skip post-install commands')
		.option('--project-dir <path>', 'Project directory for project-scoped files (default: cwd)')
		.option('--json', 'Output results as JSON')
		.action(async (ownerSlug: string, opts: CloneOptions) => {
			if (opts.json) {
				setOutputMode('json');
			}

			// Parse <owner>/<slug>
			const slashIdx = ownerSlug.indexOf('/');
			if (slashIdx <= 0 || slashIdx === ownerSlug.length - 1) {
				error('Invalid format. Expected: <owner>/<slug> (e.g. alice/my-setup)');
				process.exit(1);
			}
			const owner = ownerSlug.slice(0, slashIdx);
			const slug = ownerSlug.slice(slashIdx + 1);

			// Fetch setup metadata
			let setup: SetupMeta;
			try {
				setup = await get<SetupMeta>(`/setups/${owner}/${slug}`);
			} catch (err) {
				if (err instanceof ApiError && err.status === 404) {
					error(`Setup "${owner}/${slug}" not found.`);
				} else if (err instanceof Error) {
					error(`Failed to fetch setup: ${err.message}`);
				} else {
					error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			// Fetch setup files
			let files: SetupFileRecord[];
			try {
				files = await get<SetupFileRecord[]>(`/setups/${owner}/${slug}/files`);
			} catch (err) {
				if (err instanceof Error) {
					error(`Failed to fetch setup files: ${err.message}`);
				} else {
					error('An unexpected error occurred.');
				}
				process.exit(1);
			}

			if (files.length === 0) {
				warning('This setup has no files to install.');
				if (isJsonMode()) {
					json({
						setup: { owner, slug, name: setup.name },
						files: [],
						written: 0,
						skipped: 0,
						backedUp: 0
					});
				}
				process.exit(0);
			}

			// Prompt for install destination (interactive only)
			let destination: 'current' | 'global' = 'current';
			if (!isJsonMode()) {
				destination = await promptDestination();
			}

			// Resolve project directory
			let projectDir: string;
			if (destination === 'global') {
				projectDir = path.join(os.homedir(), '.magpie', 'setups', owner, slug);
			} else {
				projectDir = opts.projectDir ? path.resolve(opts.projectDir) : process.cwd();
			}

			if (!isJsonMode()) {
				print(`\nCloning ${owner}/${slug} → ${projectDir}\n`);
				if (opts.dryRun) {
					info('Dry run — no files will be written.\n');
				}
			}

			// Write files
			let writeResult;
			try {
				writeResult = await writeSetupFiles(files, {
					projectDir,
					force: opts.force,
					dryRun: opts.dryRun
				});
			} catch (err) {
				if (err instanceof Error) {
					error(`Failed to write files: ${err.message}`);
				} else {
					error('An unexpected error occurred while writing files.');
				}
				process.exit(1);
			}

			// Record clone event — best-effort, never fail the whole operation
			if (!opts.dryRun) {
				try {
					await post(`/setups/${owner}/${slug}/clone`, {});
				} catch {
					// Silently ignore — clone tracking is non-critical
				}
			}

			// Output summary
			if (isJsonMode()) {
				json({
					setup: { owner, slug, name: setup.name },
					destination,
					projectDir,
					dryRun: opts.dryRun ?? false,
					written: writeResult.written,
					skipped: writeResult.skipped,
					backedUp: writeResult.backedUp,
					files: writeResult.files
				});
			} else {
				print('');

				if (opts.dryRun) {
					success(`Dry run complete: ${writeResult.files.length} file(s) would be written.`);
				} else {
					if (writeResult.written > 0 || writeResult.backedUp > 0) {
						success(`Cloned ${owner}/${slug} successfully.`);
					} else if (writeResult.skipped === writeResult.files.length) {
						warning('All files were skipped — nothing was written.');
					}

					const parts: string[] = [];
					if (writeResult.written > 0) parts.push(`${writeResult.written} written`);
					if (writeResult.backedUp > 0) parts.push(`${writeResult.backedUp} backed up`);
					if (writeResult.skipped > 0) parts.push(`${writeResult.skipped} skipped`);
					if (parts.length > 0) print(`  ${parts.join(', ')}`);
				}

				print('');
				for (const f of writeResult.files) {
					const icon = f.outcome === 'written' ? '✓' : f.outcome === 'backed-up' ? '↻' : '-';
					print(`  ${icon} ${f.target}`);
					if (f.backupPath) {
						print(`    (backup: ${f.backupPath})`);
					}
				}
			}
		});
}
