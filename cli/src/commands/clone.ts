import os from 'os';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Command } from 'commander';
import { get, post, ApiError } from '../api.js';
import { writeSetupFiles } from '../files.js';
import { promptDestination, confirmPostInstall, pickFiles } from '../prompts.js';
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

const execAsync = promisify(exec);

interface SetupMeta {
	id: string;
	name: string;
	slug: string;
	description: string;
	ownerUsername: string;
	clonesCount: number;
	starsCount: number;
	postInstall?: string | null;
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
	pick?: boolean;
	/** false when --no-post-install is passed; true (default) otherwise */
	postInstall?: boolean;
	projectDir?: string;
	dir?: string;
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
		.option('--dir <path>', 'Override destination directory for project-scoped files')
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

			// --pick: interactive file selection (skip in JSON mode — use all files)
			if (opts.pick && !isJsonMode()) {
				const selectedIndices = await pickFiles(files);
				if (selectedIndices.length === 0) {
					warning('No files selected. Nothing to install.');
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
				// Prompt for install destination (interactive only)
				let dest: 'current' | 'global' = 'current';
				if (!isJsonMode()) {
					dest = await promptDestination();
				}
				destination = dest;

				if (dest === 'global') {
					projectDir = path.join(os.homedir(), '.magpie', 'setups', owner, slug);
				} else {
					projectDir = opts.projectDir ? path.resolve(opts.projectDir) : process.cwd();
				}
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

			// Post-install execution
			// opts.postInstall is false when --no-post-install is passed; true (default) otherwise
			const shouldRunPostInstall =
				!opts.dryRun &&
				opts.postInstall !== false &&
				!isJsonMode() &&
				setup.postInstall != null &&
				setup.postInstall.trim() !== '';

			let postInstallResult: { ran: boolean; command?: string; output?: string; error?: string } = {
				ran: false
			};

			if (shouldRunPostInstall) {
				const cmd = setup.postInstall!;
				print('');
				info(`Post-install: ${cmd}`);
				const confirmed = await confirmPostInstall(cmd);
				if (confirmed) {
					try {
						const { stdout, stderr } = await execAsync(cmd, { cwd: projectDir });
						if (stdout) print(stdout.trimEnd());
						if (stderr) print(stderr.trimEnd());
						success('Post-install command completed.');
						postInstallResult = { ran: true, command: cmd, output: stdout };
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err);
						error(`Post-install failed: ${msg}`);
						postInstallResult = { ran: false, command: cmd, error: msg };
					}
				} else {
					info('Post-install skipped.');
					postInstallResult = { ran: false, command: cmd };
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
					files: writeResult.files,
					postInstall: postInstallResult
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
