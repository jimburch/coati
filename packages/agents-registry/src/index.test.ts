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

const REQUIRED_SLUGS = ['claude-code', 'codex', 'copilot', 'cursor', 'gemini', 'opencode'];
const VALID_COMPONENT_TYPES: ComponentType[] = [
	'instruction',
	'command',
	'skill',
	'mcp_server',
	'hook'
];
const VALID_SCOPES: Scope[] = ['project', 'global'];

describe('AGENTS registry structure', () => {
	it('exports all six launch agents with complete, well-formed metadata', () => {
		expect(AGENTS.map((a) => a.slug).sort()).toEqual([...REQUIRED_SLUGS].sort());
		expect(AGENTS.length).toBe(6);
		// Types line up: AgentDefinition shape is satisfied by every registry entry
		const typed: AgentDefinition[] = AGENTS;
		expect(typed.length).toBe(6);

		for (const slug of REQUIRED_SLUGS) {
			const agent = AGENTS_BY_SLUG[slug];
			expect(agent, `AGENTS_BY_SLUG lookup for ${slug}`).toBeDefined();
			expect(agent.slug).toBe(slug);
			expect(agent.displayName.length).toBeGreaterThan(0);
			expect(agent.icon.length).toBeGreaterThan(0);
			expect(agent.website.startsWith('https://')).toBe(true);
			expect(typeof agent.official).toBe('boolean');

			for (const mapping of [...agent.projectGlobs, ...agent.globalGlobs]) {
				expect(mapping.glob.length).toBeGreaterThan(0);
				expect(VALID_COMPONENT_TYPES).toContain(mapping.componentType);
			}

			expect(Array.isArray(agent.detection.homePaths)).toBe(true);
			expect(Array.isArray(agent.detection.cliCommands)).toBe(true);

			expect(agent.scopes.length).toBeGreaterThan(0);
			for (const scope of agent.scopes) {
				expect(VALID_SCOPES).toContain(scope);
			}
		}
	});

	it('each agent has the expected detection rules and scope capabilities', () => {
		const expected: Record<
			string,
			{ home?: string; cli: string; scopes: Scope[]; notScopes?: Scope[] }
		> = {
			'claude-code': { home: '.claude', cli: 'claude', scopes: ['project', 'global'] },
			codex: { home: '.codex', cli: 'codex', scopes: ['project', 'global'] },
			copilot: { cli: 'gh', scopes: ['project'], notScopes: ['global'] },
			cursor: { home: '.cursor', cli: 'cursor', scopes: ['project', 'global'] },
			gemini: { home: '.gemini', cli: 'gemini', scopes: ['project', 'global'] },
			opencode: { home: '.config/opencode', cli: 'opencode', scopes: ['project', 'global'] }
		};

		for (const [slug, e] of Object.entries(expected)) {
			const agent = AGENTS_BY_SLUG[slug];
			if (e.home) expect(agent.detection.homePaths).toContain(e.home);
			expect(agent.detection.cliCommands).toContain(e.cli);
			for (const s of e.scopes) expect(agent.scopes).toContain(s);
			for (const s of e.notScopes ?? []) expect(agent.scopes).not.toContain(s);
		}
	});
});

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
	type Case = [path: string, agent: string, componentType?: ComponentType];

	// Minimal coverage: at least one file per agent hitting each known componentType.
	// Repeated paths across agents live in a single table — losing 2–3 near-duplicate
	// cases is acceptable for the coverage-vs-noise tradeoff.
	const cases: Case[] = [
		// claude-code
		['CLAUDE.md', 'claude-code', 'instruction'],
		['.claude/settings.json', 'claude-code', 'instruction'],
		['.claude/commands/review.md', 'claude-code', 'command'],
		['.claude/hooks/pre-commit.sh', 'claude-code', 'hook'],
		['.claude/skills/api-patterns/SKILL.md', 'claude-code', 'skill'],
		['.mcp.json', 'claude-code', 'mcp_server'],
		// codex
		['AGENTS.md', 'codex'],
		['.codex/config.toml', 'codex'],
		['.codex/agents/reviewer.toml', 'codex'],
		['.agents/skills/api-patterns/SKILL.md', 'codex'],
		// copilot
		['.github/copilot-instructions.md', 'copilot'],
		['.github/copilot/instructions.md', 'copilot'],
		['.github/copilot/mcp.json', 'copilot', 'mcp_server'],
		['.github/copilot/agents.json', 'copilot'],
		['.github/copilot/firewall.json', 'copilot'],
		['.github/copilot/setup.sh', 'copilot', 'hook'],
		['.github/copilot/prompts/review.md', 'copilot', 'command'],
		['.vscode/settings.json', 'copilot'],
		// cursor
		['.cursorrules', 'cursor'],
		['.cursorignore', 'cursor'],
		['.cursorindexingignore', 'cursor'],
		['.cursor/rules/typescript.mdc', 'cursor', 'instruction'],
		['.cursor/mcp.json', 'cursor', 'mcp_server'],
		['.cursor/hooks.json', 'cursor', 'hook'],
		['.cursor/commands/review.md', 'cursor', 'command'],
		['.cursor/skills/api-patterns/SKILL.md', 'cursor', 'skill'],
		// gemini
		['GEMINI.md', 'gemini'],
		['.geminiignore', 'gemini'],
		['.gemini/settings.json', 'gemini'],
		['.gemini/commands/review.toml', 'gemini', 'command'],
		['.gemini/skills/api-patterns/SKILL.md', 'gemini', 'skill'],
		['.gemini/policies/shell.toml', 'gemini'],
		// opencode
		['opencode.md', 'opencode'],
		['.opencode.json', 'opencode'],
		['.opencode/commands/review.md', 'opencode', 'command']
	];

	it('maps each known path to the right agent (and componentType where specified)', () => {
		for (const [filePath, expectedSlug, expectedType] of cases) {
			const agent = getAgentForFile(filePath);
			expect(agent, `agent for ${filePath}`).toBeDefined();
			expect(agent!.slug).toBe(expectedSlug);

			if (expectedType) {
				expect(getComponentTypeForFile(filePath), `componentType for ${filePath}`).toBe(
					expectedType
				);
			}
		}
	});

	it('returns undefined for unknown files and normalizes Windows-style separators', () => {
		for (const p of ['README.md', 'src/index.ts', 'package.json']) {
			expect(getAgentForFile(p)).toBeUndefined();
			expect(getComponentTypeForFile(p)).toBeUndefined();
		}
		expect(getAgentForFile('.claude\\commands\\review.md')?.slug).toBe('claude-code');
	});

	it('every file under playground/ is recognized by getAgentForFile (no dead files)', () => {
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
		for (const p of playgroundFiles) {
			expect(getAgentForFile(p), `unrecognized playground file: ${p}`).toBeDefined();
		}
	});
});
