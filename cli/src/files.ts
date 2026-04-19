import fs from 'fs';
import os from 'os';
import path from 'path';
import { classifyTarget, type TargetClassification } from './classify-target.js';
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

export type WriteOutcome = 'written' | 'skipped' | 'backed-up' | 'unchanged';

export interface FileWriteResult {
	target: string;
	outcome: WriteOutcome;
	backupPath?: string;
}

export interface WriteResult {
	written: number;
	skipped: number;
	backedUp: number;
	unchanged: number;
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

	// Phase 1: classify every target. A `is-directory` classification aborts the
	// entire operation before touching disk.
	const classified: {
		file: FileToWrite;
		absolutePath: string;
		classification: TargetClassification;
	}[] = files.map((file) => {
		const absolutePath = resolveTargetPath(file.path, placement, options);
		return { file, absolutePath, classification: classifyTarget(absolutePath, file.content) };
	});

	const directoryBlocker = classified.find((c) => c.classification.kind === 'is-directory');
	if (directoryBlocker) {
		throw new Error(
			`Cannot write file — a directory already exists at ${directoryBlocker.absolutePath}`
		);
	}

	// Phase 2: batch-resolve conflicts. Identical files are never part of the
	// conflict set; `different` and `unreadable` are.
	let resolutions = new Map<string, ConflictResolution>();

	if (!options.dryRun && !options.force && !options.isJson) {
		const conflicts: ConflictFile[] = classified
			.filter(
				(c) => c.classification.kind === 'different' || c.classification.kind === 'unreadable'
			)
			.map((c) => ({
				relativePath: c.file.path,
				absolutePath: c.absolutePath,
				incomingContent: c.file.content
			}));

		if (conflicts.length > 0) {
			resolutions = await resolveConflicts(conflicts);
		}
	}

	// Phase 3: apply resolutions and write.
	const results: FileWriteResult[] = [];

	for (const { file, absolutePath, classification } of classified) {
		if (classification.kind === 'identical') {
			results.push({ target: absolutePath, outcome: 'unchanged' });
			continue;
		}

		if (options.dryRun) {
			results.push({ target: absolutePath, outcome: 'written' });
			continue;
		}

		let shouldWrite = true;
		let outcome: WriteOutcome = 'written';
		let backupPath: string | undefined;

		const isConflict = classification.kind === 'different' || classification.kind === 'unreadable';

		if (isConflict) {
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
	const unchanged = results.filter((r) => r.outcome === 'unchanged').length;

	return { written, skipped, backedUp, unchanged, files: results };
}
