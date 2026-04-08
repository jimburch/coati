import { describe, it, expect } from 'vitest';
import {
	AGENTS,
	AGENTS_BY_SLUG,
	globToRegex,
	matchesGlob,
	getAgentForFile,
	getComponentTypeForFile,
	type AgentDefinition,
	type ComponentType,
	type Scope
} from './index.js';

// ─── Registry structure ───────────────────────────────────────────────────────

describe('AGENTS registry structure', () => {
	const REQUIRED_SLUGS = ['claude-code', 'codex', 'copilot', 'cursor', 'gemini', 'opencode'];

	it('defines all six launch agents', () => {
		const slugs = AGENTS.map((a) => a.slug).sort();
		expect(slugs).toEqual(REQUIRED_SLUGS.sort());
	});

	it.each(REQUIRED_SLUGS)('%s — has all required metadata fields', (slug) => {
		const agent = AGENTS_BY_SLUG[slug];
		expect(agent).toBeDefined();
		expect(typeof agent.slug).toBe('string');
		expect(agent.slug.length).toBeGreaterThan(0);
		expect(typeof agent.displayName).toBe('string');
		expect(agent.displayName.length).toBeGreaterThan(0);
		expect(typeof agent.icon).toBe('string');
		expect(agent.icon.length).toBeGreaterThan(0);
		expect(typeof agent.website).toBe('string');
		expect(agent.website.startsWith('https://')).toBe(true);
		expect(typeof agent.official).toBe('boolean');
	});

	it.each(REQUIRED_SLUGS)('%s — has projectGlobs with valid componentTypes', (slug) => {
		const agent = AGENTS_BY_SLUG[slug];
		const validTypes: ComponentType[] = ['instruction', 'command', 'skill', 'mcp_server', 'hook'];
		expect(Array.isArray(agent.projectGlobs)).toBe(true);
		for (const mapping of agent.projectGlobs) {
			expect(typeof mapping.glob).toBe('string');
			expect(mapping.glob.length).toBeGreaterThan(0);
			expect(validTypes).toContain(mapping.componentType);
		}
	});

	it.each(REQUIRED_SLUGS)('%s — has globalGlobs array', (slug) => {
		const agent = AGENTS_BY_SLUG[slug];
		expect(Array.isArray(agent.globalGlobs)).toBe(true);
		const validTypes: ComponentType[] = ['instruction', 'command', 'skill', 'mcp_server', 'hook'];
		for (const mapping of agent.globalGlobs) {
			expect(typeof mapping.glob).toBe('string');
			expect(validTypes).toContain(mapping.componentType);
		}
	});

	it.each(REQUIRED_SLUGS)('%s — has detection rules', (slug) => {
		const agent = AGENTS_BY_SLUG[slug];
		expect(Array.isArray(agent.detection.homePaths)).toBe(true);
		expect(Array.isArray(agent.detection.cliCommands)).toBe(true);
	});

	it.each(REQUIRED_SLUGS)('%s — has valid scopes', (slug) => {
		const agent = AGENTS_BY_SLUG[slug];
		const validScopes: Scope[] = ['project', 'global'];
		expect(Array.isArray(agent.scopes)).toBe(true);
		expect(agent.scopes.length).toBeGreaterThan(0);
		for (const scope of agent.scopes) {
			expect(validScopes).toContain(scope);
		}
	});

	it('AGENTS_BY_SLUG provides O(1) access to each agent', () => {
		for (const slug of REQUIRED_SLUGS) {
			const agent = AGENTS_BY_SLUG[slug];
			expect(agent).toBeDefined();
			expect(agent.slug).toBe(slug);
		}
	});
});

// ─── Agent-specific detection rules ──────────────────────────────────────────

describe('detection rules', () => {
	it('claude-code detects via ~/.claude and "claude" CLI', () => {
		const agent = AGENTS_BY_SLUG['claude-code'];
		expect(agent.detection.homePaths).toContain('.claude');
		expect(agent.detection.cliCommands).toContain('claude');
	});

	it('codex detects via ~/.codex and "codex" CLI', () => {
		const agent = AGENTS_BY_SLUG['codex'];
		expect(agent.detection.homePaths).toContain('.codex');
		expect(agent.detection.cliCommands).toContain('codex');
	});

	it('copilot detects via "gh" CLI', () => {
		const agent = AGENTS_BY_SLUG['copilot'];
		expect(agent.detection.cliCommands).toContain('gh');
	});

	it('cursor detects via ~/.cursor and "cursor" CLI', () => {
		const agent = AGENTS_BY_SLUG['cursor'];
		expect(agent.detection.homePaths).toContain('.cursor');
		expect(agent.detection.cliCommands).toContain('cursor');
	});

	it('gemini detects via ~/.gemini and "gemini" CLI', () => {
		const agent = AGENTS_BY_SLUG['gemini'];
		expect(agent.detection.homePaths).toContain('.gemini');
		expect(agent.detection.cliCommands).toContain('gemini');
	});

	it('opencode detects via ~/.config/opencode and "opencode" CLI', () => {
		const agent = AGENTS_BY_SLUG['opencode'];
		expect(agent.detection.homePaths).toContain('.config/opencode');
		expect(agent.detection.cliCommands).toContain('opencode');
	});
});

// ─── Scopes ───────────────────────────────────────────────────────────────────

describe('scopes', () => {
	it('claude-code supports both project and global', () => {
		const agent = AGENTS_BY_SLUG['claude-code'];
		expect(agent.scopes).toContain('project');
		expect(agent.scopes).toContain('global');
	});

	it('copilot supports only project scope', () => {
		const agent = AGENTS_BY_SLUG['copilot'];
		expect(agent.scopes).toContain('project');
		expect(agent.scopes).not.toContain('global');
	});

	it('cursor supports both project and global', () => {
		const agent = AGENTS_BY_SLUG['cursor'];
		expect(agent.scopes).toContain('project');
		expect(agent.scopes).toContain('global');
	});

	it('gemini supports both project and global', () => {
		const agent = AGENTS_BY_SLUG['gemini'];
		expect(agent.scopes).toContain('project');
		expect(agent.scopes).toContain('global');
	});

	it('opencode supports both project and global', () => {
		const agent = AGENTS_BY_SLUG['opencode'];
		expect(agent.scopes).toContain('project');
		expect(agent.scopes).toContain('global');
	});
});

// ─── globToRegex ─────────────────────────────────────────────────────────────

describe('globToRegex', () => {
	it('matches an exact path', () => {
		const re = globToRegex('CLAUDE.md');
		expect(re.test('CLAUDE.md')).toBe(true);
		expect(re.test('CLAUDE.txt')).toBe(false);
		expect(re.test('foo/CLAUDE.md')).toBe(false);
	});

	it('matches * within a single segment', () => {
		const re = globToRegex('.claude/commands/*.md');
		expect(re.test('.claude/commands/review.md')).toBe(true);
		expect(re.test('.claude/commands/test-coverage.md')).toBe(true);
		expect(re.test('.claude/commands/sub/review.md')).toBe(false);
		expect(re.test('.claude/commands/review.txt')).toBe(false);
	});

	it('matches **/ for zero or more directory levels', () => {
		const re = globToRegex('.claude/skills/**/*.md');
		expect(re.test('.claude/skills/api-patterns/SKILL.md')).toBe(true);
		expect(re.test('.claude/skills/deep/nested/SKILL.md')).toBe(true);
		// **/ matches zero or more segments, so a direct child also matches
		expect(re.test('.claude/skills/SKILL.md')).toBe(true);
		// Must have the correct extension
		expect(re.test('.claude/skills/api-patterns/SKILL.sh')).toBe(false);
	});

	it('matches ** alone as a wildcard for anything', () => {
		const re = globToRegex('.claude/hooks/**/*');
		expect(re.test('.claude/hooks/pre-commit.sh')).toBe(true);
		expect(re.test('.claude/hooks/nested/hook.sh')).toBe(true);
	});

	it('escapes regex-special characters in literal parts', () => {
		const re = globToRegex('.mcp.json');
		expect(re.test('.mcp.json')).toBe(true);
		expect(re.test('XmcpXjson')).toBe(false);
	});
});

// ─── matchesGlob ─────────────────────────────────────────────────────────────

describe('matchesGlob', () => {
	it('returns true for matching paths', () => {
		expect(matchesGlob('CLAUDE.md', 'CLAUDE.md')).toBe(true);
		expect(matchesGlob('.claude/commands/review.md', '.claude/commands/*.md')).toBe(true);
	});

	it('returns false for non-matching paths', () => {
		expect(matchesGlob('README.md', 'CLAUDE.md')).toBe(false);
		expect(matchesGlob('.claude/settings.json', '.claude/commands/*.md')).toBe(false);
	});
});

// ─── getAgentForFile ──────────────────────────────────────────────────────────

describe('getAgentForFile', () => {
	const cases: Array<[string, string]> = [
		// Claude Code
		['CLAUDE.md', 'claude-code'],
		['.claude/settings.json', 'claude-code'],
		['.claude/commands/review.md', 'claude-code'],
		['.claude/hooks/pre-commit.sh', 'claude-code'],
		['.claude/skills/api-patterns/SKILL.md', 'claude-code'],
		['.mcp.json', 'claude-code'],
		// Codex
		['AGENTS.md', 'codex'],
		['.codex/config.toml', 'codex'],
		['.codex/agents/reviewer.toml', 'codex'],
		['.agents/skills/api-patterns/SKILL.md', 'codex'],
		// Copilot
		['.github/copilot-instructions.md', 'copilot'],
		['.github/copilot/instructions.md', 'copilot'],
		['.github/copilot/mcp.json', 'copilot'],
		['.github/copilot/agents.json', 'copilot'],
		['.github/copilot/firewall.json', 'copilot'],
		['.github/copilot/setup.sh', 'copilot'],
		['.github/copilot/prompts/review.md', 'copilot'],
		['.vscode/settings.json', 'copilot'],
		// Cursor
		['.cursorrules', 'cursor'],
		['.cursorignore', 'cursor'],
		['.cursorindexingignore', 'cursor'],
		['.cursor/rules/typescript.mdc', 'cursor'],
		['.cursor/mcp.json', 'cursor'],
		['.cursor/hooks.json', 'cursor'],
		['.cursor/commands/review.md', 'cursor'],
		['.cursor/skills/api-patterns/SKILL.md', 'cursor'],
		// Gemini
		['GEMINI.md', 'gemini'],
		['.geminiignore', 'gemini'],
		['.gemini/settings.json', 'gemini'],
		['.gemini/commands/review.toml', 'gemini'],
		['.gemini/skills/api-patterns/SKILL.md', 'gemini'],
		['.gemini/policies/shell.toml', 'gemini'],
		// OpenCode
		['opencode.md', 'opencode'],
		['.opencode.json', 'opencode'],
		['.opencode/commands/review.md', 'opencode']
	];

	it.each(cases)('%s → agent "%s"', (filePath, expectedSlug) => {
		const agent = getAgentForFile(filePath);
		expect(agent).toBeDefined();
		expect(agent!.slug).toBe(expectedSlug);
	});

	it('returns undefined for unknown files', () => {
		expect(getAgentForFile('README.md')).toBeUndefined();
		expect(getAgentForFile('src/index.ts')).toBeUndefined();
		expect(getAgentForFile('package.json')).toBeUndefined();
	});

	it('normalizes Windows-style backslash paths', () => {
		const agent = getAgentForFile('.claude\\commands\\review.md');
		expect(agent?.slug).toBe('claude-code');
	});
});

// ─── getComponentTypeForFile ──────────────────────────────────────────────────

describe('getComponentTypeForFile', () => {
	const cases: Array<[string, ComponentType]> = [
		['CLAUDE.md', 'instruction'],
		['.claude/settings.json', 'instruction'],
		['.claude/commands/review.md', 'command'],
		['.claude/hooks/pre-commit.sh', 'hook'],
		['.claude/skills/api-patterns/SKILL.md', 'skill'],
		['.mcp.json', 'mcp_server'],
		['.github/copilot/mcp.json', 'mcp_server'],
		['.github/copilot/setup.sh', 'hook'],
		['.github/copilot/prompts/review.md', 'command'],
		['.cursor/rules/typescript.mdc', 'instruction'],
		['.cursor/mcp.json', 'mcp_server'],
		['.cursor/hooks.json', 'hook'],
		['.cursor/commands/review.md', 'command'],
		['.cursor/skills/api-patterns/SKILL.md', 'skill'],
		['.gemini/commands/review.toml', 'command'],
		['.gemini/skills/testing/SKILL.md', 'skill'],
		['.opencode/commands/review.md', 'command']
	];

	it.each(cases)('%s → componentType "%s"', (filePath, expectedType) => {
		expect(getComponentTypeForFile(filePath)).toBe(expectedType);
	});

	it('returns undefined for unknown files', () => {
		expect(getComponentTypeForFile('package.json')).toBeUndefined();
		expect(getComponentTypeForFile('src/app.ts')).toBeUndefined();
	});
});

// ─── Playground coverage check ────────────────────────────────────────────────

describe('playground file coverage', () => {
	// Every file from playground/ directories should be recognizable.
	const playgroundFiles = [
		// claude-code
		'CLAUDE.md',
		'.claude/settings.json',
		'.claude/commands/review.md',
		'.claude/commands/test-coverage.md',
		'.claude/hooks/pre-commit.sh',
		'.claude/skills/api-patterns/SKILL.md',
		'.mcp.json',
		// codex
		'AGENTS.md',
		'.codex/config.toml',
		'.codex/agents/reviewer.toml',
		'.codex/agents/test-writer.toml',
		'.agents/skills/api-patterns/SKILL.md',
		'.agents/skills/testing/SKILL.md',
		// copilot
		'.github/copilot-instructions.md',
		'.github/copilot/instructions.md',
		'.github/copilot/mcp.json',
		'.github/copilot/agents.json',
		'.github/copilot/firewall.json',
		'.github/copilot/setup.sh',
		'.github/copilot/prompts/review.md',
		'.github/copilot/prompts/test-generation.md',
		'.github/copilot/prompts/refactor.md',
		'.vscode/settings.json',
		// cursor
		'.cursorrules',
		'.cursorignore',
		'.cursorindexingignore',
		'.cursor/rules/typescript.mdc',
		'.cursor/rules/api-patterns.mdc',
		'.cursor/rules/testing.mdc',
		'.cursor/mcp.json',
		'.cursor/hooks.json',
		'.cursor/commands/review.md',
		'.cursor/commands/test-coverage.md',
		'.cursor/commands/refactor.md',
		'.cursor/skills/api-patterns/SKILL.md',
		// gemini
		'GEMINI.md',
		'.geminiignore',
		'.gemini/settings.json',
		'.gemini/commands/review.toml',
		'.gemini/commands/test-coverage.toml',
		'.gemini/commands/deploy-check.toml',
		'.gemini/skills/api-patterns/SKILL.md',
		'.gemini/skills/testing/SKILL.md',
		'.gemini/policies/shell.toml',
		// opencode
		'opencode.md',
		'.opencode.json',
		'.opencode/commands/review.md',
		'.opencode/commands/test-coverage.md',
		'.opencode/commands/deploy-check.md'
	];

	it.each(playgroundFiles)('"%s" is recognized by getAgentForFile', (filePath) => {
		expect(getAgentForFile(filePath)).toBeDefined();
	});
});

// ─── Type exports ─────────────────────────────────────────────────────────────

describe('type exports', () => {
	it('AgentDefinition shape is satisfied by all registry entries', () => {
		// TypeScript compile-time check — if this runs, the types are correct.
		const agents: AgentDefinition[] = AGENTS;
		expect(agents.length).toBe(6);
	});
});
