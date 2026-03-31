import fs from 'fs';
import os from 'os';
import path from 'path';
import { type ManifestPlacement } from './manifest.js';
import { resolveConflict } from './prompts.js';

export interface FileToWrite {
	path: string;
	content: string;
}

export interface WriteOptions {
	/** Project directory for project-scoped files. Defaults to process.cwd(). */
	projectDir?: string;
	/** Setup-level placement: 'global' writes to ~/, 'project' writes relative to projectDir. */
	placement?: ManifestPlacement;
	/** Overwrite all conflicts without prompting. */
	force?: boolean;
	/** Preview what would be written without actually writing anything. */
	dryRun?: boolean;
	/** Treat as non-interactive: auto-skip conflicts instead of prompting. */
	isJson?: boolean;
}

export type WriteOutcome = 'written' | 'skipped' | 'backed-up';

export interface FileWriteResult {
	target: string;
	outcome: WriteOutcome;
	backupPath?: string;
}

export interface WriteResult {
	written: number;
	skipped: number;
	backedUp: number;
	files: FileWriteResult[];
}

/**
 * Resolve a file's `path` entry to an absolute path on disk.
 *
 * - `global` placement: file goes to `~/<path>` (user's home directory)
 * - `project` placement: file goes to `<projectDir>/<path>` (project directory or cwd)
 */
export function resolveTargetPath(
	filePath: string,
	placement: ManifestPlacement,
	options: WriteOptions = {}
): string {
	const projectDir = options.projectDir ?? process.cwd();

	if (placement === 'global') {
		return path.join(os.homedir(), filePath);
	}
	return path.resolve(projectDir, filePath);
}

/**
 * Write a set of files to disk, handling conflicts interactively.
 *
 * - Creates parent directories as needed.
 * - Writes atomically (temp file + rename).
 * - Prompts for per-file conflict resolution (overwrite / skip / backup) unless
 *   --force is set or JSON mode is active (JSON mode auto-skips conflicts).
 * - Backup copies are written to `<target>.coati-backup`.
 */
export async function writeSetupFiles(
	files: FileToWrite[],
	options: WriteOptions = {}
): Promise<WriteResult> {
	const results: FileWriteResult[] = [];
	const placement = options.placement ?? 'project';

	for (const file of files) {
		const resolvedPath = resolveTargetPath(file.path, placement, options);

		if (options.dryRun) {
			results.push({ target: resolvedPath, outcome: 'written' });
			continue;
		}

		const exists = fs.existsSync(resolvedPath);

		let shouldWrite = true;
		let outcome: WriteOutcome = 'written';
		let backupPath: string | undefined;

		if (exists) {
			let resolution: 'overwrite' | 'skip' | 'backup';

			if (options.force) {
				resolution = 'overwrite';
			} else if (options.isJson) {
				// Non-interactive mode: skip conflicts rather than hanging on a prompt.
				resolution = 'skip';
			} else {
				resolution = await resolveConflict(resolvedPath, file.content);
			}

			if (resolution === 'skip') {
				shouldWrite = false;
				outcome = 'skipped';
			} else if (resolution === 'backup') {
				backupPath = resolvedPath + '.coati-backup';
				fs.copyFileSync(resolvedPath, backupPath);
				outcome = 'backed-up';
			}
			// 'overwrite' → shouldWrite stays true, outcome stays 'written'
		}

		if (shouldWrite) {
			const dir = path.dirname(resolvedPath);
			fs.mkdirSync(dir, { recursive: true });

			// Atomic write: write to a temp file then rename into place.
			const tmpPath = resolvedPath + '.coati-tmp';
			try {
				fs.writeFileSync(tmpPath, file.content, 'utf-8');
				fs.renameSync(tmpPath, resolvedPath);
			} catch (err) {
				// Clean up the orphaned temp file before re-throwing.
				try {
					fs.unlinkSync(tmpPath);
				} catch {
					// Ignore cleanup errors.
				}
				throw err;
			}
		}

		results.push({
			target: resolvedPath,
			outcome,
			...(backupPath !== undefined && { backupPath })
		});
	}

	const written = results.filter((r) => r.outcome === 'written').length;
	const skipped = results.filter((r) => r.outcome === 'skipped').length;
	const backedUp = results.filter((r) => r.outcome === 'backed-up').length;

	return { written, skipped, backedUp, files: results };
}
