import { createTwoFilesPatch } from 'diff';
import pc from 'picocolors';

/**
 * Generate a colorized unified diff of two file contents.
 *
 * Returns a "Files are identical" message when both strings are equal.
 * Otherwise returns a unified diff with 3 lines of context, colorized:
 * - Added lines (starting with +): green
 * - Removed lines (starting with -): red
 * - Hunk headers (starting with @@): cyan
 */
export function generateDiff(existing: string, incoming: string, filePath = 'file'): string {
	if (existing === incoming) {
		return pc.dim('Files are identical — no changes would be made.');
	}

	const patch = createTwoFilesPatch(
		`${filePath} (existing)`,
		`${filePath} (incoming)`,
		existing,
		incoming,
		undefined,
		undefined,
		{ context: 3 }
	);

	const lines = patch.split('\n');
	const colorized = lines.map((line) => {
		if (line.startsWith('@@')) return pc.cyan(line);
		if (line.startsWith('+') && !line.startsWith('+++')) return pc.green(line);
		if (line.startsWith('-') && !line.startsWith('---')) return pc.red(line);
		return line;
	});

	return colorized.join('\n');
}
