import { describe, expect, it } from 'vitest';
import { formatFileList } from './format.js';
import type { DetectedFile } from './detector.js';

const CLAUDE_FILES: DetectedFile[] = [
	{
		path: 'CLAUDE.md',
		componentType: 'instruction',
		tool: 'claude-code',
		description: 'Claude instruction file',
		isEmpty: false
	},
	{
		path: '.claude/settings.json',
		componentType: 'config',
		tool: 'claude-code',
		description: 'Claude settings',
		isEmpty: false
	}
];

const MULTI_AGENT_FILES: DetectedFile[] = [
	...CLAUDE_FILES,
	{
		path: '.cursor/rules/main.mdc',
		componentType: 'instruction',
		tool: 'cursor',
		description: 'Cursor rule',
		isEmpty: false
	},
	{
		path: 'README.md',
		componentType: 'instruction',
		tool: null,
		description: 'Shared README',
		isEmpty: false
	}
];

// Strip ANSI escape codes for easier assertion
function stripAnsi(str: string): string {
	// eslint-disable-next-line no-control-regex
	return str.replace(/\u001B\[[0-9;]*m/g, '');
}

describe('formatFileList', () => {
	it('groups files by agent with header and separator', () => {
		const output = stripAnsi(formatFileList(CLAUDE_FILES));
		expect(output).toContain('Claude Code');
		expect(output).toContain('2 files');
		expect(output).toContain('───');
	});

	it('shows component type badge and file paths', () => {
		const output = stripAnsi(formatFileList(CLAUDE_FILES));
		expect(output).toContain('instruction');
		expect(output).toContain('CLAUDE.md');
		expect(output).toContain('config');
		expect(output).toContain('.claude/settings.json');
	});

	it('renders multiple agent groups for multi-agent projects', () => {
		const output = stripAnsi(formatFileList(MULTI_AGENT_FILES));
		expect(output).toContain('Claude Code');
		expect(output).toContain('Cursor');
	});

	it('groups files with no agent under a Shared header', () => {
		const output = stripAnsi(formatFileList(MULTI_AGENT_FILES));
		expect(output).toContain('Shared');
		expect(output).toContain('README.md');
	});

	it('shows singular "file" for single-file groups', () => {
		const output = stripAnsi(formatFileList(MULTI_AGENT_FILES));
		expect(output).toContain('1 file)');
	});

	it('returns empty string for empty input', () => {
		const output = formatFileList([]);
		expect(output).toBe('');
	});

	it('marks empty files with an (empty) tag', () => {
		const files: DetectedFile[] = [
			{ ...CLAUDE_FILES[0], isEmpty: true },
			{ ...CLAUDE_FILES[1], isEmpty: false }
		];
		const output = stripAnsi(formatFileList(files));
		const claudeLine = output.split('\n').find((l) => l.includes('CLAUDE.md'))!;
		const settingsLine = output.split('\n').find((l) => l.includes('.claude/settings.json'))!;
		expect(claudeLine).toContain('(empty)');
		expect(settingsLine).not.toContain('(empty)');
	});
});
