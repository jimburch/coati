import fs from 'fs';

/**
 * Discriminated union describing the state of a target path relative to
 * incoming file content. Computed before any write, used to decide whether
 * to skip, prompt, or abort.
 */
export type TargetClassification =
	| { kind: 'absent' }
	| { kind: 'identical' }
	| { kind: 'different' }
	| { kind: 'is-directory' }
	| { kind: 'unreadable'; reason: Error };

/**
 * Classify a target path against incoming content.
 *
 * - `absent`: nothing at the path
 * - `identical`: existing file is byte-for-byte equal to `incomingContent`
 * - `different`: existing file exists but bytes differ
 * - `is-directory`: path is a directory (can never be written as a file)
 * - `unreadable`: path exists but cannot be stat'd/read (permissions, etc.)
 *
 * Uses a stat-size short-circuit before reading the file: if the on-disk
 * size differs from the incoming UTF-8 byte length, classification is
 * `different` without opening the file.
 *
 * No normalization is applied — CRLF vs LF, trailing newlines, and BOMs all
 * count as differences.
 */
export function classifyTarget(
	absolutePath: string,
	incomingContent: string
): TargetClassification {
	let stats: fs.Stats;
	try {
		stats = fs.statSync(absolutePath);
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === 'ENOENT') {
			// Disambiguate: truly absent vs. broken symlink (lstat succeeds on the link itself).
			try {
				fs.lstatSync(absolutePath);
				return { kind: 'unreadable', reason: err as Error };
			} catch {
				return { kind: 'absent' };
			}
		}
		return { kind: 'unreadable', reason: err as Error };
	}

	if (stats.isDirectory()) {
		return { kind: 'is-directory' };
	}

	const incomingSize = Buffer.byteLength(incomingContent, 'utf-8');
	if (stats.size !== incomingSize) {
		return { kind: 'different' };
	}

	let existing: string;
	try {
		existing = fs.readFileSync(absolutePath, 'utf-8');
	} catch (err) {
		return { kind: 'unreadable', reason: err as Error };
	}

	return existing === incomingContent ? { kind: 'identical' } : { kind: 'different' };
}
