import { describe, it, expect } from 'vitest';
import {
	allowedAgentsFor,
	isAllowedHomePath,
	isPersonalFile,
	getSettingsFile,
	getOfferedSelector,
	getAgentForFile,
	getComponentTypeForFile
} from './index.js';

describe('allowedAgentsFor', () => {
	it('locks a single-Agent path to that Agent', () => {
		expect(allowedAgentsFor('CLAUDE.md')).toEqual(['claude-code']);
		expect(allowedAgentsFor('~/.claude/skills/review/SKILL.md')).toEqual(['claude-code']);
		expect(allowedAgentsFor('.cursor/rules/ts.mdc')).toEqual(['cursor']);
	});

	it('offers every Agent that reads a multi-Agent path', () => {
		expect(allowedAgentsFor('~/.gemini/GEMINI.md')).toEqual(['gemini', 'antigravity']);
		expect(allowedAgentsFor('~/.gemini/skills/x/SKILL.md')).toEqual(['gemini', 'antigravity']);
		expect(allowedAgentsFor('GEMINI.md')).toEqual(['gemini', 'antigravity']);
	});

	it('offers a shared path to its readers', () => {
		expect(allowedAgentsFor('AGENTS.md')).toEqual([
			'codex',
			'copilot',
			'cursor',
			'opencode',
			'antigravity'
		]);
		expect(allowedAgentsFor('.agents/skills/x/SKILL.md')).toEqual([
			'codex',
			'copilot',
			'cursor',
			'gemini',
			'opencode',
			'antigravity'
		]);
		expect(allowedAgentsFor('~/.agents/skills/x/SKILL.md')).not.toContain('antigravity');
	});

	it('gives a fragment its Settings file owner plus readers', () => {
		expect(allowedAgentsFor('.mcp.json#mcpServers.github')).toEqual(['claude-code', 'copilot']);
		expect(allowedAgentsFor('~/.codex/config.toml#mcp_servers.github')).toEqual(['codex']);
		expect(allowedAgentsFor('.cursor/hooks.json#hooks.afterFileEdit[command=fmt]')).toEqual([
			'cursor'
		]);
	});

	it('gives nothing to unmatched, whole Settings file, unoffered and invalid paths', () => {
		expect(allowedAgentsFor('README.md')).toEqual([]);
		expect(allowedAgentsFor('.mcp.json')).toEqual([]);
		expect(allowedAgentsFor('.claude/settings.json#apiKeyHelper')).toEqual([]);
		expect(allowedAgentsFor('../x')).toEqual([]);
	});

	it('respects Placement: a project path never matches a global-only glob', () => {
		expect(allowedAgentsFor('.codex/AGENTS.md')).toEqual([]);
		expect(allowedAgentsFor('~/.codex/AGENTS.md')).toEqual(['codex']);
	});
});

describe('isAllowedHomePath', () => {
	it.each([
		'~/.claude/skills/x/SKILL.md',
		'~/.agents/skills/x/SKILL.md',
		'~/.gemini/config/rules/a.md',
		'~/.claude/settings.json#permissions.allow[=WebSearch]',
		'~/.cursor/mcp.json#mcpServers.github'
	])('allows %s', (p) => {
		expect(isAllowedHomePath(p)).toBe(true);
	});

	it.each([
		'~/.ssh/authorized_keys',
		'~/.bashrc',
		'~/.zshrc',
		'~/.claude.json',
		'~/.claude/projects/x.json',
		'~/.mcp.json#mcpServers.x',
		'CLAUDE.md',
		'~/x/../.ssh/id_rsa'
	])('rejects %s', (p) => {
		expect(isAllowedHomePath(p)).toBe(false);
	});
});

describe('personal files', () => {
	it('flags files that are never candidates', () => {
		expect(isPersonalFile('.claude/settings.local.json')).toBe(true);
		expect(isPersonalFile('CLAUDE.local.md')).toBe(true);
		expect(isPersonalFile('~/.claude.json')).toBe(true);
		expect(isPersonalFile('CLAUDE.md')).toBe(false);
	});
});

describe('getSettingsFile', () => {
	it('finds a Settings file by Placement, with or without a selector', () => {
		expect(getSettingsFile('.mcp.json')?.format).toBe('json');
		expect(getSettingsFile('~/.codex/config.toml#mcp_servers.x')?.format).toBe('toml');
		expect(getSettingsFile('.claude/settings.json')?.placement).toBe('project');
		expect(getSettingsFile('~/.claude/settings.json')?.placement).toBe('global');
		expect(getSettingsFile('~/.copilot/mcp-config.json')?.format).toBe('json');
	});

	it('is undefined for other files and wrong Placements', () => {
		expect(getSettingsFile('CLAUDE.md')).toBeUndefined();
		expect(getSettingsFile('~/.mcp.json')).toBeUndefined();
		expect(getSettingsFile('.copilot/mcp-config.json')).toBeUndefined();
	});
});

describe('getOfferedSelector', () => {
	it.each([
		['.claude/settings.json#hooks.PreToolUse[matcher=Bash].hooks[command=lint]', 'hook'],
		['.claude/settings.json#permissions.allow[="Bash(npm test)"]', 'config'],
		['.claude/settings.json#env.NODE_ENV', 'config'],
		['.claude/settings.json#model', 'config'],
		['.mcp.json#mcpServers.github', 'mcp_server'],
		['.codex/config.toml#mcp_servers.github', 'mcp_server'],
		['.codex/config.toml#hooks.PreToolUse[matcher=""].hooks[command=x]', 'hook'],
		['~/.codex/hooks.json#hooks.Stop[matcher=""].hooks[command=x]', 'hook'],
		['.vscode/mcp.json#servers.github', 'mcp_server'],
		['.cursor/hooks.json#hooks.afterFileEdit[command="./hooks/format.sh"]', 'hook'],
		['.gemini/settings.json#hooks.BeforeTool[matcher=write_file].hooks[command=x]', 'hook'],
		['opencode.json#mcp.github', 'mcp_server'],
		['.agents/hooks.json#my-linter-hook', 'hook'],
		['~/.gemini/antigravity-cli/settings.json#statusLine', 'config']
	])('offers %s as %s', (path, type) => {
		expect(getOfferedSelector(path)?.componentType).toBe(type);
	});

	it.each([
		['apiKeyHelper', '.claude/settings.json#apiKeyHelper'],
		['an authToken-style key', '.claude/settings.json#authToken'],
		['a generic personal key', '.gemini/settings.json#telemetry'],
		['Antigravity trustedWorkspaces', '~/.gemini/antigravity-cli/settings.json#trustedWorkspaces'],
		['a whole hooks map', '.claude/settings.json#hooks'],
		['a whole permissions object', '.claude/settings.json#permissions'],
		['a whole mcpServers map', '.gemini/settings.json#mcpServers'],
		['Cursor template version key', '.cursor/hooks.json#version'],
		['MCP in Claude settings.json', '.claude/settings.json#mcpServers.github'],
		['a nested key under an unknown head', '.claude/settings.json#model.x'],
		['a personal file', '.claude/settings.local.json#model'],
		['a non-Settings host', 'CLAUDE.md#x'],
		['a whole Settings file', '.mcp.json']
	])('never offers %s', (_label, path) => {
		expect(getOfferedSelector(path)).toBeUndefined();
	});
});

describe('Placement-aware detection', () => {
	it('matches ~/ paths against globalGlobs and others against projectGlobs', () => {
		expect(getAgentForFile('~/.codex/prompts/review.md')?.slug).toBe('codex');
		expect(getComponentTypeForFile('~/.codex/prompts/review.md')).toBe('command');
		expect(getAgentForFile('.codex/prompts/review.md')).toBeUndefined();
	});

	it('keeps first-match order for multi-Agent paths', () => {
		expect(getAgentForFile('~/.gemini/GEMINI.md')?.slug).toBe('gemini');
		expect(getAgentForFile('GEMINI.md')?.slug).toBe('gemini');
	});

	it('gives shared paths a type but no Agent', () => {
		expect(getAgentForFile('AGENTS.md')).toBeUndefined();
		expect(getComponentTypeForFile('AGENTS.md')).toBe('instruction');
		expect(getComponentTypeForFile('~/.agents/skills/x/scripts/run.sh')).toBe('skill');
	});

	it('types fragments by their selector and leaves whole Settings files undetected', () => {
		expect(getAgentForFile('.mcp.json#mcpServers.github')?.slug).toBe('claude-code');
		expect(getComponentTypeForFile('.mcp.json#mcpServers.github')).toBe('mcp_server');
		expect(getAgentForFile('.mcp.json')).toBeUndefined();
		expect(getComponentTypeForFile('.claude/settings.json')).toBeUndefined();
	});

	it('ships skill supporting files, not just *.md', () => {
		expect(getComponentTypeForFile('.claude/skills/review/scripts/check.sh')).toBe('skill');
	});
});
