import { describe, it, expect } from 'vitest';
import {
	globToRegex,
	matchesGlob,
	getAgentForFile,
	getComponentTypeForFile,
	type ComponentType
} from './index.js';

describe('glob utilities', () => {
	it('globToRegex: handles literal paths, single-segment *, recursive **, and regex-escape', () => {
		const exact = globToRegex('CLAUDE.md');
		expect(exact.test('CLAUDE.md')).toBe(true);
		expect(exact.test('CLAUDE.txt')).toBe(false);
		expect(exact.test('foo/CLAUDE.md')).toBe(false);

		const singleSeg = globToRegex('.claude/commands/*.md');
		expect(singleSeg.test('.claude/commands/review.md')).toBe(true);
		expect(singleSeg.test('.claude/commands/test-coverage.md')).toBe(true);
		expect(singleSeg.test('.claude/commands/sub/review.md')).toBe(false);
		expect(singleSeg.test('.claude/commands/review.txt')).toBe(false);

		const recursive = globToRegex('.claude/skills/**/*.md');
		expect(recursive.test('.claude/skills/api-patterns/SKILL.md')).toBe(true);
		expect(recursive.test('.claude/skills/deep/nested/SKILL.md')).toBe(true);
		expect(recursive.test('.claude/skills/SKILL.md')).toBe(true);
		expect(recursive.test('.claude/skills/api-patterns/SKILL.sh')).toBe(false);

		const starStar = globToRegex('.claude/hooks/**/*');
		expect(starStar.test('.claude/hooks/pre-commit.sh')).toBe(true);
		expect(starStar.test('.claude/hooks/nested/hook.sh')).toBe(true);

		const escaped = globToRegex('.mcp.json');
		expect(escaped.test('.mcp.json')).toBe(true);
		expect(escaped.test('XmcpXjson')).toBe(false);
	});

	it('matchesGlob: convenience wrapper returns true/false for matches', () => {
		expect(matchesGlob('CLAUDE.md', 'CLAUDE.md')).toBe(true);
		expect(matchesGlob('.claude/commands/review.md', '.claude/commands/*.md')).toBe(true);
		expect(matchesGlob('README.md', 'CLAUDE.md')).toBe(false);
		expect(matchesGlob('.claude/settings.json', '.claude/commands/*.md')).toBe(false);
	});
});

describe('getAgentForFile / getComponentTypeForFile', () => {
	type Case = [path: string, agent: string | null, componentType: ComponentType];

	// One or more paths per Agent and Placement. `null` = shared (no Agent).
	const cases: Case[] = [
		// claude-code
		['CLAUDE.md', 'claude-code', 'instruction'],
		['.claude/CLAUDE.md', 'claude-code', 'instruction'],
		['.claude/rules/frontend/react.md', 'claude-code', 'instruction'],
		['.claude/agents/reviewer.md', 'claude-code', 'instruction'],
		['.claude/commands/review.md', 'claude-code', 'command'],
		['.claude/hooks/pre-commit.sh', 'claude-code', 'hook'],
		['.claude/skills/api-patterns/SKILL.md', 'claude-code', 'skill'],
		['~/.claude/CLAUDE.md', 'claude-code', 'instruction'],
		['~/.claude/skills/review/scripts/run.sh', 'claude-code', 'skill'],
		// codex
		['AGENTS.override.md', 'codex', 'instruction'],
		['.codex/agents/reviewer.toml', 'codex', 'instruction'],
		['~/.codex/AGENTS.md', 'codex', 'instruction'],
		['~/.codex/prompts/review.md', 'codex', 'command'],
		// copilot
		['.github/copilot-instructions.md', 'copilot', 'instruction'],
		['.github/instructions/frontend/react.instructions.md', 'copilot', 'instruction'],
		['.github/agents/reviewer.agent.md', 'copilot', 'instruction'],
		['.github/prompts/review.prompt.md', 'copilot', 'command'],
		['.github/hooks/lint.json', 'copilot', 'hook'],
		['.github/skills/x/SKILL.md', 'copilot', 'skill'],
		['.github/workflows/copilot-setup-steps.yml', 'copilot', 'setup_script'],
		['~/.copilot/copilot-instructions.md', 'copilot', 'instruction'],
		['~/.copilot/hooks/lint.json', 'copilot', 'hook'],
		// cursor
		['.cursorrules', 'cursor', 'instruction'],
		['.cursorignore', 'cursor', 'instruction'],
		['.cursor/rules/typescript.mdc', 'cursor', 'instruction'],
		['.cursor/agents/reviewer.md', 'cursor', 'instruction'],
		['.cursor/commands/review.md', 'cursor', 'command'],
		['.cursor/skills/api-patterns/SKILL.md', 'cursor', 'skill'],
		['~/.cursor/skills/x/SKILL.md', 'cursor', 'skill'],
		// gemini
		['GEMINI.md', 'gemini', 'instruction'],
		['.geminiignore', 'gemini', 'instruction'],
		['.gemini/commands/review.toml', 'gemini', 'command'],
		['.gemini/skills/api-patterns/SKILL.md', 'gemini', 'skill'],
		['.gemini/policies/shell.toml', 'gemini', 'instruction'],
		['~/.gemini/GEMINI.md', 'gemini', 'instruction'],
		['~/.gemini/policies/shell.toml', 'gemini', 'instruction'],
		// opencode
		['.opencode/commands/review.md', 'opencode', 'command'],
		['.opencode/agents/reviewer.md', 'opencode', 'instruction'],
		['.opencode/plugins/notify.ts', 'opencode', 'hook'],
		['~/.config/opencode/AGENTS.md', 'opencode', 'instruction'],
		['~/.config/opencode/skills/x/SKILL.md', 'opencode', 'skill'],
		// antigravity
		['.agents/AGENTS.md', 'antigravity', 'instruction'],
		['.agents/GEMINI.md', 'antigravity', 'instruction'],
		['.agents/rules/style.md', 'antigravity', 'instruction'],
		['.agents/agents/reviewer/agent.md', 'antigravity', 'instruction'],
		['.agents/rules.json', 'antigravity', 'config'],
		['.agents/skills.json', 'antigravity', 'config'],
		['.agents/plugins/lint/plugin.json', 'antigravity', 'hook'],
		['~/.gemini/config/GEMINI.md', 'antigravity', 'instruction'],
		['~/.gemini/config/rules/style.md', 'antigravity', 'instruction'],
		['~/.gemini/config/skills/x/SKILL.md', 'antigravity', 'skill'],
		['~/.gemini/antigravity-cli/skills/x/SKILL.md', 'antigravity', 'skill'],
		['~/.gemini/config/plugins/lint/plugin.json', 'antigravity', 'hook'],
		// shared
		['AGENTS.md', null, 'instruction'],
		['.agents/skills/api-patterns/SKILL.md', null, 'skill'],
		['~/.agents/skills/x/SKILL.md', null, 'skill']
	];

	it.each(cases)('%s → %s (%s)', (filePath, slug, type) => {
		expect(getAgentForFile(filePath)?.slug ?? null).toBe(slug);
		expect(getComponentTypeForFile(filePath)).toBe(type);
	});

	it.each([
		// Settings files are never whole-file paths
		'.mcp.json',
		'.claude/settings.json',
		'.codex/config.toml',
		'.cursor/mcp.json',
		'.cursor/hooks.json',
		'.gemini/settings.json',
		'opencode.json',
		'.agents/mcp_config.json',
		// dropped as stale or unconfirmed (#392)
		'.github/copilot/mcp.json',
		'.github/copilot/setup.sh',
		'.vscode/settings.json',
		'.cursor/rules/old.md',
		'.cursorindexingignore',
		'opencode.md',
		'.opencode.json',
		'.agents/workflows/deploy.md',
		// unrelated
		'README.md',
		'src/index.ts',
		'package.json'
	])('detects nothing for %s', (filePath) => {
		expect(getAgentForFile(filePath)).toBeUndefined();
		expect(getComponentTypeForFile(filePath)).toBeUndefined();
	});

	it('normalizes Windows-style separators', () => {
		expect(getAgentForFile('.claude\\commands\\review.md')?.slug).toBe('claude-code');
	});
});
