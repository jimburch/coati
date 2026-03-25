import { describe, expect, it } from 'vitest';
import { formatFileList } from './format.js';
import type { DetectedFile } from './detector.js';

const CLAUDE_FILES: DetectedFile[] = [
	{
		source: 'CLAUDE.md',
		target: 'CLAUDE.md',
		placement: 'project',
		componentType: 'instruction',
		tool: 'claude-code',
		description: 'Claude instruction file'
	},
	{
		source: '.claude/settings.json',
		target: '~/.claude/settings.json',
		placement: 'global',
		componentType: 'config',
		tool: 'claude-code',
		description: 'Claude settings'
	}
];

const MULTI_AGENT_FILES: DetectedFile[] = [
	...CLAUDE_FILES,
	{
		source: '.cursor/rules/main.mdc',
		target: '.cursor/rules/main.mdc',
		placement: 'project',
		componentType: 'instruction',
		tool: 'cursor',
		description: 'Cursor rule'
	},
	{
		source: 'README.md',
		target: 'README.md',
		placement: 'project',
		componentType: 'instruction',
		tool: '',
		description: 'Shared README'
	}
];

// Strip ANSI escape codes for easier assertion
function stripAnsi(str: string): string {
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
		expect(output).toContain('CLAUDE.md → CLAUDE.md');
		expect(output).toContain('config');
		expect(output).toContain('.claude/settings.json → ~/.claude/settings.json');
	});

	it('renders multiple agent groups for multi-agent projects', () => {
		const output = stripAnsi(formatFileList(MULTI_AGENT_FILES));
		expect(output).toContain('Claude Code');
		expect(output).toContain('Cursor');
	});

	it('uses _unknown as group header for files with empty tool', () => {
		const output = stripAnsi(formatFileList(MULTI_AGENT_FILES));
		expect(output).toContain('_unknown');
		expect(output).toContain('README.md → README.md');
	});

	it('shows singular "file" for single-file groups', () => {
		const output = stripAnsi(formatFileList(MULTI_AGENT_FILES));
		expect(output).toContain('1 file)');
	});

	it('returns empty string for empty input', () => {
		const output = formatFileList([]);
		expect(output).toBe('');
	});
});
