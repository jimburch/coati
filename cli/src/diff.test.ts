import { describe, expect, it } from 'vitest';
import { generateDiff } from './diff.js';

// Strip ANSI escape codes so tests work regardless of color support.
function stripAnsi(str: string): string {
	// eslint-disable-next-line no-control-regex
	return str.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('generateDiff', () => {
	it('returns "identical" message when both strings are equal', () => {
		const result = generateDiff('same content', 'same content');
		expect(stripAnsi(result)).toContain('identical');
	});

	it('returns "identical" message for two empty strings', () => {
		const result = generateDiff('', '');
		expect(stripAnsi(result)).toContain('identical');
	});

	it('produces diff output containing removed and added lines', () => {
		const result = stripAnsi(generateDiff('old line\n', 'new line\n'));
		expect(result).toContain('-old line');
		expect(result).toContain('+new line');
	});

	it('includes hunk headers (@@) in the output', () => {
		const result = stripAnsi(generateDiff('a\n', 'b\n'));
		expect(result).toContain('@@');
	});

	it('handles empty existing with non-empty incoming', () => {
		const result = stripAnsi(generateDiff('', 'new content\n'));
		expect(result).toContain('+new content');
	});

	it('handles non-empty existing with empty incoming', () => {
		const result = stripAnsi(generateDiff('old content\n', ''));
		expect(result).toContain('-old content');
	});

	it('includes filePath in the diff header', () => {
		const result = stripAnsi(generateDiff('a\n', 'b\n', 'src/foo.ts'));
		expect(result).toContain('src/foo.ts');
	});

	it('uses 3 lines of context around changes', () => {
		const existing = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].join('\n') + '\n';
		const incoming = ['a', 'b', 'c', 'X', 'e', 'f', 'g'].join('\n') + '\n';
		const result = stripAnsi(generateDiff(existing, incoming));
		// With 3 lines of context, lines adjacent to the change should appear
		expect(result).toContain('c');
		expect(result).toContain('e');
	});
});
