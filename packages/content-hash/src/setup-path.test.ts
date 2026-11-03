import { describe, it, expect } from 'vitest';
import { parseSetupPath, formatSetupPath, parseSelector } from './index.js';

describe('parseSetupPath', () => {
	it('reads a project whole-file path', () => {
		expect(parseSetupPath('CLAUDE.md')).toEqual({
			placement: 'project',
			filePath: 'CLAUDE.md',
			selector: null
		});
	});

	it('reads a leading ~/ as global placement and drops it from filePath', () => {
		expect(parseSetupPath('~/.claude/skills/review/SKILL.md')).toEqual({
			placement: 'global',
			filePath: '.claude/skills/review/SKILL.md',
			selector: null
		});
		expect(parseSetupPath('~/a')).toMatchObject({ placement: 'global', filePath: 'a' });
	});

	it('splits a fragment path at its #', () => {
		expect(parseSetupPath('~/.codex/config.toml#mcp_servers.github')).toEqual({
			placement: 'global',
			filePath: '.codex/config.toml',
			selector: parseSelector('mcp_servers.github')
		});
	});

	it('allows # inside a quoted selector token', () => {
		expect(
			parseSetupPath('.claude/settings.json#hooks.Stop[matcher=""].hooks[command="echo #done"]')
		).toMatchObject({
			filePath: '.claude/settings.json',
			selector: parseSelector('hooks.Stop[matcher=""].hooks[command="echo #done"]')
		});
	});

	it.each([
		['~ in a later segment', 'a/~/b'],
		['~user form', '~a'],
		['a parent segment', '../x'],
		['an absolute path', '/x'],
		['a Windows drive path', 'C:\\x'],
		['a .git segment', '.git/hooks/x'],
		['two #', '.mcp.json#mcpServers#github'],
		['# in the file part', 'a#b.json#x'],
		['an empty selector', '.mcp.json#'],
		['an invalid selector', '.mcp.json#mcpServers.'],
		['an empty path', ''],
		['an empty file part', '#mcpServers.github']
	])('rejects %s (%s)', (_label, path) => {
		expect(parseSetupPath(path)).toBeNull();
	});
});

describe('formatSetupPath', () => {
	it.each([
		'CLAUDE.md',
		'~/.claude/skills/review/SKILL.md',
		'.mcp.json#mcpServers.github',
		'~/.claude/settings.json#permissions.allow[="Bash(npm test)"]',
		'.claude/settings.json#hooks.Stop[matcher=""].hooks[command="echo #done"]'
	])('round-trips %s', (path) => {
		expect(formatSetupPath(parseSetupPath(path)!)).toBe(path);
	});

	it('throws when the parts do not make a valid Setup path', () => {
		expect(() =>
			formatSetupPath({ placement: 'project', filePath: '../x', selector: null })
		).toThrow();
		expect(() =>
			formatSetupPath({ placement: 'global', filePath: '~/x', selector: null })
		).toThrow();
	});
});
