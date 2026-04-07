import fs from 'fs';
import os from 'os';
import path from 'path';
import { type ManifestPlacement } from './manifest.js';
import { resolveConflicts, type ConflictFile, type ConflictResolution } from './prompts.js';

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
 * - Collects all conflicts and presents them in a single batch prompt (unless
 *   --force is set or JSON mode is active).
 * - Backup copies are written to `<target>.coati-backup`.
 */
export async function writeSetupFiles(
	files: FileToWrite[],
	options: WriteOptions = {}
): Promise<WriteResult> {
	const placement = options.placement ?? 'project';

	// Phase 1: resolve paths and detect conflicts
	const resolved = files.map((file) => {
		const absolutePath = resolveTargetPath(file.path, placement, options);
		return { file, absolutePath, exists: !options.dryRun && fs.existsSync(absolutePath) };
	});

	// Phase 2: batch-resolve conflicts
	let resolutions = new Map<string, ConflictResolution>();

	if (!options.dryRun && !options.force && !options.isJson) {
		const conflicts: ConflictFile[] = resolved
			.filter((r) => r.exists)
			.map((r) => ({
				relativePath: r.file.path,
				absolutePath: r.absolutePath,
				incomingContent: r.file.content
			}));

		if (conflicts.length > 0) {
			resolutions = await resolveConflicts(conflicts);
		}
	}

	// Phase 3: write files using resolutions
	const results: FileWriteResult[] = [];

	for (const { file, absolutePath, exists } of resolved) {
		if (options.dryRun) {
			results.push({ target: absolutePath, outcome: 'written' });
			continue;
		}

		let shouldWrite = true;
		let outcome: WriteOutcome = 'written';
		let backupPath: string | undefined;

		if (exists) {
			let resolution: ConflictResolution;

			if (options.force) {
				resolution = 'overwrite';
			} else if (options.isJson) {
				resolution = 'skip';
			} else {
				resolution = resolutions.get(absolutePath) ?? 'overwrite';
			}

			if (resolution === 'skip') {
				shouldWrite = false;
				outcome = 'skipped';
			} else if (resolution === 'backup') {
				backupPath = absolutePath + '.coati-backup';
				fs.copyFileSync(absolutePath, backupPath);
				outcome = 'backed-up';
			}
		}

		if (shouldWrite) {
			const dir = path.dirname(absolutePath);
			fs.mkdirSync(dir, { recursive: true });

			const tmpPath = absolutePath + '.coati-tmp';
			try {
				fs.writeFileSync(tmpPath, file.content, 'utf-8');
				fs.renameSync(tmpPath, absolutePath);
			} catch (err) {
				try {
					fs.unlinkSync(tmpPath);
				} catch {
					// Ignore cleanup errors.
				}
				throw err;
			}
		}

		results.push({
			target: absolutePath,
			outcome,
			...(backupPath !== undefined && { backupPath })
		});
	}

	const written = results.filter((r) => r.outcome === 'written').length;
	const skipped = results.filter((r) => r.outcome === 'skipped').length;
	const backedUp = results.filter((r) => r.outcome === 'backed-up').length;

	return { written, skipped, backedUp, files: results };
}
