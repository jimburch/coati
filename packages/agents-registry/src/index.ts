/**
 * @coati/agents-registry
 *
 * Definitions for every supported Agent: which files it reads at each
 * Placement, which Settings files it reads and which Settings fragments a
 * Setup may ship from them, how to detect it on a machine, and the helpers
 * that Classification, publish validation and the CLI detector share.
 *
 * Sources: docs/research/agent-config-locations.md (#392),
 * docs/research/antigravity-cli.md (#399) and spec #402 §4.
 */

import { parseSetupPath, selectorMatchesPattern, type Selector } from '@coati/content-hash';
import type { ComponentType, Placement } from '@coati/validation';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ComponentType, Placement };

/** Placement values an Agent supports. Same values as `Placement`. */
export type Scope = Placement;

export type AgentSlug =
	| 'claude-code'
	| 'codex'
	| 'copilot'
	| 'cursor'
	| 'gemini'
	| 'opencode'
	| 'antigravity';

/** Maps a glob pattern to the component type it represents. */
export interface FilePatternMapping {
	/** Glob relative to the project root (projectGlobs) or home dir (globalGlobs). */
	glob: string;
	componentType: ComponentType;
}

/** A glob read by several Agents. Its Classification is the owner's pick among `readers`. */
export interface SharedGlob extends FilePatternMapping {
	placement: Placement;
	/** The Agents that read this path: the allowed Agents for Classification. */
	readers: AgentSlug[];
}

/** Which kind of string a placeholder rewrite applies to (spec §8). */
export type VarContext = 'hook' | 'mcp';

/** One kind of Settings fragment a Settings file offers. */
export interface OfferedSelector {
	/** Selector pattern; `<…>` matches any one token (see `selectorMatchesPattern`). */
	pattern: string;
	componentType: ComponentType;
}

/** How a secret is turned into an environment reference (spec §8). */
export type EnvRef =
	/** Replace the literal with `template`, where `NAME` is the variable name, e.g. `${NAME}`. */
	| { form: 'template'; template: string }
	/** Codex: drop the literal from `env` and append `NAME` to the server's `listKey` array. */
	| { form: 'forward'; listKey: string };

/**
 * A config file that a Setup never ships whole. Each offered fragment ships
 * as its own SetupFile at `<path>#<selector>`.
 */
export interface SettingsFileDef {
	/** Path relative to the project root or home dir, per `placement`. */
	glob: string;
	placement: Placement;
	format: 'json' | 'jsonc' | 'toml';
	/** Most specific first. A lone `<key>` pattern means "any other top-level key". */
	selectors: OfferedSelector[];
	/** Top-level keys that are never offered, on top of `GENERIC_PERSONAL_KEY`. */
	personalKeys: string[];
	/** Native project-root variable per context. Absent means Coati tokens. */
	projectVar?: Partial<Record<VarContext, string>>;
	/** Native home variable per context. Absent means Coati tokens. */
	homeVar?: Partial<Record<VarContext, string>>;
	/** How secrets become env references. Absent means the value is blanked with a notice. */
	envRef?: EnvRef;
	/** What a missing host file starts as. Its top-level keys are structural, never offered. */
	template?: Record<string, unknown>;
	/** Other Agents that read this file, for Classification (Decided #11). */
	readers?: AgentSlug[];
}

/** A file that is never a candidate, such as `.claude/settings.local.json`. */
export interface PersonalFile {
	glob: string;
	placement: Placement;
}

/** Rules for detecting whether an agent is installed on the user's machine. */
export interface DetectionRule {
	/** Home-relative paths to check for existence (e.g. ".claude" → ~/.claude). */
	homePaths: string[];
	/** CLI command names to check on PATH (e.g. "claude"). */
	cliCommands: string[];
}

/** Full definition for one Agent. */
export interface AgentDefinition {
	slug: AgentSlug;
	displayName: string;
	/** Icon filename (src/lib/assets/agents/<slug>.svg in the web app). */
	icon: string;
	website: string;
	/** True when the agent is made by its official vendor/company. */
	official: boolean;
	/** Whole files read inside a project, relative to the project root. */
	projectGlobs: FilePatternMapping[];
	/** Whole files read from the home directory, relative to `~`. */
	globalGlobs: FilePatternMapping[];
	settingsFiles: SettingsFileDef[];
	personalFiles: PersonalFile[];
	detection: DetectionRule;
	/** Which Placements this agent supports. */
	scopes: Scope[];
}

// ─── Glob matching ────────────────────────────────────────────────────────────

/**
 * Convert a simple glob pattern (using `*` and `**`) to a RegExp.
 *
 * Supported syntax:
 *   - `**\/` before a segment  →  match any number of directory segments
 *   - `**`  →  match anything (including slashes)
 *   - `*`   →  match anything within a single path segment (no slashes)
 *   - `?`   →  match one character that is not a slash
 *   - All other regex-special characters are escaped.
 */
export function globToRegex(glob: string): RegExp {
	let pattern = '';
	let i = 0;
	while (i < glob.length) {
		const ch = glob[i];
		if (ch === '*') {
			if (glob[i + 1] === '*') {
				if (glob[i + 2] === '/') {
					// **/ → optional directory prefix
					pattern += '(?:.+/)?';
					i += 3;
				} else {
					// ** → match anything
					pattern += '.*';
					i += 2;
				}
			} else {
				// * → match within a single segment
				pattern += '[^/]*';
				i += 1;
			}
		} else if (ch === '?') {
			pattern += '[^/]';
			i += 1;
		} else if ('.+^${}()|[]\\'.includes(ch)) {
			pattern += '\\' + ch;
			i += 1;
		} else {
			pattern += ch;
			i += 1;
		}
	}
	return new RegExp(`^${pattern}$`);
}

/** Return true if `filePath` matches the given glob pattern. */
export function matchesGlob(filePath: string, glob: string): boolean {
	return globToRegex(glob).test(filePath);
}

// ─── Settings file building blocks ────────────────────────────────────────────

/** Top-level keys never offered from any Settings file (Decided #8). */
export const GENERIC_PERSONAL_KEY = /auth|login|token|credential|account|telemetry|otel/i;

const OTHER_TOP_LEVEL_KEY: OfferedSelector = { pattern: '<key>', componentType: 'config' };
const MCP_SERVERS = (key: string): OfferedSelector => ({
	pattern: `${key}.<name>`,
	componentType: 'mcp_server'
});
const MATCHER_HOOKS: OfferedSelector = {
	pattern: 'hooks.<Event>[matcher=<m>].hooks[command=<cmd>]',
	componentType: 'hook'
};
const SHELL_HOME = { hook: '$HOME' } as const;

const CLAUDE_PERSONAL_KEYS = [
	'apiKeyHelper',
	'awsAuthRefresh',
	'awsCredentialExport',
	'otelHeadersHelper',
	'forceLoginMethod',
	'forceLoginOrgUUID'
];

function claudeSettings(placement: Placement): SettingsFileDef {
	return {
		glob: '.claude/settings.json',
		placement,
		format: 'jsonc',
		selectors: [
			MATCHER_HOOKS,
			{ pattern: 'permissions.allow[=<rule>]', componentType: 'config' },
			{ pattern: 'permissions.ask[=<rule>]', componentType: 'config' },
			{ pattern: 'permissions.deny[=<rule>]', componentType: 'config' },
			{ pattern: 'env.<NAME>', componentType: 'config' },
			OTHER_TOP_LEVEL_KEY
		],
		personalKeys: CLAUDE_PERSONAL_KEYS,
		projectVar: { hook: '${CLAUDE_PROJECT_DIR}' },
		homeVar: SHELL_HOME
	};
}

function codexConfig(placement: Placement): SettingsFileDef {
	return {
		glob: '.codex/config.toml',
		placement,
		format: 'toml',
		// [hooks] has the same event/matcher layout as hooks.json (codex-rs config/src/hook_config.rs).
		selectors: [MCP_SERVERS('mcp_servers'), MATCHER_HOOKS, OTHER_TOP_LEVEL_KEY],
		personalKeys: [],
		homeVar: SHELL_HOME,
		envRef: { form: 'forward', listKey: 'env_vars' }
	};
}

function codexHooks(placement: Placement): SettingsFileDef {
	return {
		glob: '.codex/hooks.json',
		placement,
		format: 'json',
		// Verified against codex-rs/protocol/src/hooks.rs: { hooks: { <Event>: [{ matcher, hooks: [...] }] } }.
		selectors: [MATCHER_HOOKS],
		personalKeys: [],
		homeVar: SHELL_HOME
	};
}

function cursorMcp(placement: Placement): SettingsFileDef {
	return {
		glob: '.cursor/mcp.json',
		placement,
		format: 'json',
		selectors: [MCP_SERVERS('mcpServers')],
		personalKeys: [],
		projectVar: { mcp: '${workspaceFolder}' },
		homeVar: { mcp: '${userHome}' },
		envRef: { form: 'template', template: '${env:NAME}' }
	};
}

function cursorHooks(placement: Placement): SettingsFileDef {
	return {
		glob: '.cursor/hooks.json',
		placement,
		format: 'json',
		// matcher is a handler field in Cursor, not a group, so handlers are keyed by command alone.
		selectors: [{ pattern: 'hooks.<event>[command=<cmd>]', componentType: 'hook' }],
		personalKeys: [],
		projectVar: { hook: '${workspaceFolder}' },
		homeVar: { hook: '${userHome}' },
		template: { version: 1, hooks: {} }
	};
}

function geminiSettings(placement: Placement): SettingsFileDef {
	return {
		glob: '.gemini/settings.json',
		placement,
		format: 'jsonc',
		selectors: [MCP_SERVERS('mcpServers'), MATCHER_HOOKS, OTHER_TOP_LEVEL_KEY],
		personalKeys: [],
		projectVar: { hook: '$GEMINI_PROJECT_DIR' },
		homeVar: SHELL_HOME,
		envRef: { form: 'template', template: '${NAME}' }
	};
}

function opencodeConfig(glob: string, placement: Placement): SettingsFileDef {
	return {
		glob,
		placement,
		format: 'jsonc',
		selectors: [MCP_SERVERS('mcp'), OTHER_TOP_LEVEL_KEY],
		personalKeys: [],
		envRef: { form: 'template', template: '{env:NAME}' }
	};
}

function antigravityMcp(glob: string, placement: Placement): SettingsFileDef {
	return {
		glob,
		placement,
		format: 'json',
		selectors: [MCP_SERVERS('mcpServers')],
		personalKeys: []
	};
}

function antigravityHooks(glob: string, placement: Placement): SettingsFileDef {
	return {
		glob,
		placement,
		format: 'json',
		// One fragment per named top-level hook.
		selectors: [{ pattern: '<hookName>', componentType: 'hook' }],
		personalKeys: [],
		homeVar: SHELL_HOME
	};
}

// ─── Agent definitions ────────────────────────────────────────────────────────

export const AGENTS: AgentDefinition[] = [
	// ── Claude Code ────────────────────────────────────────────────────────
	{
		slug: 'claude-code',
		displayName: 'Claude Code',
		icon: 'claude-code.svg',
		website: 'https://www.anthropic.com/claude-code',
		official: true,
		projectGlobs: [
			{ glob: 'CLAUDE.md', componentType: 'instruction' },
			{ glob: '.claude/CLAUDE.md', componentType: 'instruction' },
			{ glob: '.claude/rules/**/*.md', componentType: 'instruction' },
			{ glob: '.claude/agents/*.md', componentType: 'instruction' },
			{ glob: '.claude/commands/**/*.md', componentType: 'command' },
			{ glob: '.claude/hooks/**', componentType: 'hook' },
			{ glob: '.claude/skills/**', componentType: 'skill' }
		],
		globalGlobs: [
			{ glob: '.claude/CLAUDE.md', componentType: 'instruction' },
			{ glob: '.claude/rules/**/*.md', componentType: 'instruction' },
			{ glob: '.claude/agents/*.md', componentType: 'instruction' },
			{ glob: '.claude/commands/**/*.md', componentType: 'command' },
			{ glob: '.claude/hooks/**', componentType: 'hook' },
			{ glob: '.claude/skills/**', componentType: 'skill' }
		],
		settingsFiles: [
			claudeSettings('project'),
			claudeSettings('global'),
			{
				glob: '.mcp.json',
				placement: 'project',
				format: 'json',
				selectors: [MCP_SERVERS('mcpServers')],
				personalKeys: [],
				projectVar: { mcp: '${CLAUDE_PROJECT_DIR:-.}' },
				envRef: { form: 'template', template: '${NAME}' },
				readers: ['copilot']
			}
		],
		personalFiles: [
			{ glob: '.claude/settings.local.json', placement: 'project' },
			{ glob: 'CLAUDE.local.md', placement: 'project' },
			// Written by Claude Code itself: sign-in, user MCP, per-project state.
			{ glob: '.claude.json', placement: 'global' }
		],
		detection: {
			homePaths: ['.claude'],
			cliCommands: ['claude']
		},
		scopes: ['project', 'global']
	},

	// ── Codex ──────────────────────────────────────────────────────────────
	{
		slug: 'codex',
		displayName: 'Codex',
		icon: 'codex.svg',
		website: 'https://openai.com/codex',
		official: true,
		projectGlobs: [
			{ glob: 'AGENTS.override.md', componentType: 'instruction' },
			{ glob: '.codex/agents/*.toml', componentType: 'instruction' }
		],
		globalGlobs: [
			{ glob: '.codex/AGENTS.md', componentType: 'instruction' },
			{ glob: '.codex/AGENTS.override.md', componentType: 'instruction' },
			{ glob: '.codex/prompts/*.md', componentType: 'command' },
			{ glob: '.codex/agents/*.toml', componentType: 'instruction' }
		],
		settingsFiles: [
			codexConfig('project'),
			codexConfig('global'),
			codexHooks('project'),
			codexHooks('global')
		],
		personalFiles: [],
		detection: {
			homePaths: ['.codex'],
			cliCommands: ['codex']
		},
		scopes: ['project', 'global']
	},

	// ── GitHub Copilot ─────────────────────────────────────────────────────
	{
		slug: 'copilot',
		displayName: 'GitHub Copilot',
		icon: 'copilot.svg',
		website: 'https://github.com/features/copilot',
		official: true,
		projectGlobs: [
			{ glob: '.github/copilot-instructions.md', componentType: 'instruction' },
			{ glob: '.github/instructions/**/*.instructions.md', componentType: 'instruction' },
			{ glob: '.github/agents/*.agent.md', componentType: 'instruction' },
			{ glob: '.github/prompts/*.prompt.md', componentType: 'command' },
			{ glob: '.github/hooks/*.json', componentType: 'hook' },
			{ glob: '.github/skills/**', componentType: 'skill' },
			{ glob: '.github/workflows/copilot-setup-steps.yml', componentType: 'setup_script' }
		],
		globalGlobs: [
			{ glob: '.copilot/copilot-instructions.md', componentType: 'instruction' },
			{ glob: '.copilot/instructions/**', componentType: 'instruction' },
			{ glob: '.copilot/skills/**', componentType: 'skill' },
			{ glob: '.copilot/hooks/*.json', componentType: 'hook' }
		],
		settingsFiles: [
			{
				glob: '.copilot/mcp-config.json',
				placement: 'global',
				format: 'json',
				selectors: [MCP_SERVERS('mcpServers')],
				personalKeys: []
			},
			{
				glob: '.vscode/mcp.json',
				placement: 'project',
				format: 'jsonc',
				selectors: [MCP_SERVERS('servers')],
				personalKeys: [],
				envRef: { form: 'template', template: '${env:NAME}' }
			}
		],
		personalFiles: [],
		detection: {
			homePaths: ['.copilot'],
			cliCommands: ['gh']
		},
		scopes: ['project', 'global']
	},

	// ── Cursor ─────────────────────────────────────────────────────────────
	{
		slug: 'cursor',
		displayName: 'Cursor',
		icon: 'cursor.svg',
		website: 'https://cursor.com',
		official: true,
		projectGlobs: [
			{ glob: '.cursorrules', componentType: 'instruction' },
			{ glob: '.cursorignore', componentType: 'instruction' },
			{ glob: '.cursor/rules/**/*.mdc', componentType: 'instruction' },
			{ glob: '.cursor/agents/*.md', componentType: 'instruction' },
			{ glob: '.cursor/commands/**/*.md', componentType: 'command' },
			{ glob: '.cursor/skills/**', componentType: 'skill' }
		],
		globalGlobs: [
			{ glob: '.cursor/agents/*.md', componentType: 'instruction' },
			{ glob: '.cursor/skills/**', componentType: 'skill' }
		],
		settingsFiles: [
			cursorMcp('project'),
			cursorMcp('global'),
			cursorHooks('project'),
			cursorHooks('global')
		],
		personalFiles: [],
		detection: {
			homePaths: ['.cursor'],
			cliCommands: ['cursor']
		},
		scopes: ['project', 'global']
	},

	// ── Gemini CLI ─────────────────────────────────────────────────────────
	{
		slug: 'gemini',
		displayName: 'Gemini CLI',
		icon: 'gemini.svg',
		website: 'https://ai.google.dev',
		official: true,
		projectGlobs: [
			{ glob: 'GEMINI.md', componentType: 'instruction' },
			{ glob: '.geminiignore', componentType: 'instruction' },
			{ glob: '.gemini/commands/**/*.toml', componentType: 'command' },
			{ glob: '.gemini/skills/**', componentType: 'skill' },
			{ glob: '.gemini/policies/**/*.toml', componentType: 'instruction' }
		],
		globalGlobs: [
			{ glob: '.gemini/GEMINI.md', componentType: 'instruction' },
			{ glob: '.gemini/commands/**/*.toml', componentType: 'command' },
			{ glob: '.gemini/skills/**', componentType: 'skill' },
			{ glob: '.gemini/policies/*.toml', componentType: 'instruction' }
		],
		settingsFiles: [geminiSettings('project'), geminiSettings('global')],
		personalFiles: [],
		detection: {
			homePaths: ['.gemini'],
			cliCommands: ['gemini']
		},
		scopes: ['project', 'global']
	},

	// ── OpenCode ───────────────────────────────────────────────────────────
	{
		slug: 'opencode',
		displayName: 'OpenCode',
		icon: 'opencode.svg',
		website: 'https://opencode.ai',
		official: true,
		projectGlobs: [
			{ glob: '.opencode/commands/**/*.md', componentType: 'command' },
			{ glob: '.opencode/agents/**', componentType: 'instruction' },
			{ glob: '.opencode/skills/**', componentType: 'skill' },
			{ glob: '.opencode/plugins/**', componentType: 'hook' }
		],
		globalGlobs: [
			{ glob: '.config/opencode/AGENTS.md', componentType: 'instruction' },
			{ glob: '.config/opencode/commands/**/*.md', componentType: 'command' },
			{ glob: '.config/opencode/agents/**', componentType: 'instruction' },
			{ glob: '.config/opencode/skills/**', componentType: 'skill' },
			{ glob: '.config/opencode/plugins/**', componentType: 'hook' }
		],
		settingsFiles: [
			opencodeConfig('opencode.json', 'project'),
			opencodeConfig('.config/opencode/opencode.json', 'global')
		],
		personalFiles: [],
		detection: {
			homePaths: ['.config/opencode'],
			cliCommands: ['opencode']
		},
		scopes: ['project', 'global']
	},

	// ── Antigravity ────────────────────────────────────────────────────────
	{
		slug: 'antigravity',
		displayName: 'Antigravity',
		icon: 'antigravity.svg',
		website: 'https://antigravity.google',
		official: true,
		projectGlobs: [
			// Root GEMINI.md is also read by Antigravity, so it's a multi-Agent path.
			{ glob: 'GEMINI.md', componentType: 'instruction' },
			{ glob: '.agents/AGENTS.md', componentType: 'instruction' },
			{ glob: '.agents/GEMINI.md', componentType: 'instruction' },
			{ glob: '.agents/rules/*.md', componentType: 'instruction' },
			{ glob: '.agents/agents/**/*.md', componentType: 'instruction' },
			{ glob: '.agents/rules.json', componentType: 'config' },
			{ glob: '.agents/agents.json', componentType: 'config' },
			{ glob: '.agents/skills.json', componentType: 'config' },
			// #399 says "typed by content"; defaults to hook (Decided #12).
			{ glob: '.agents/plugins/**', componentType: 'hook' }
		],
		globalGlobs: [
			{ glob: '.gemini/AGENTS.md', componentType: 'instruction' },
			{ glob: '.gemini/GEMINI.md', componentType: 'instruction' },
			{ glob: '.gemini/config/AGENTS.md', componentType: 'instruction' },
			{ glob: '.gemini/config/GEMINI.md', componentType: 'instruction' },
			{ glob: '.gemini/config/rules/*.md', componentType: 'instruction' },
			{ glob: '.gemini/config/agents/**/*.md', componentType: 'instruction' },
			{ glob: '.gemini/config/skills/**', componentType: 'skill' },
			{ glob: '.gemini/antigravity-cli/skills/**', componentType: 'skill' },
			{ glob: '.gemini/skills/**', componentType: 'skill' },
			{ glob: '.gemini/config/plugins/**', componentType: 'hook' }
		],
		settingsFiles: [
			antigravityMcp('.agents/mcp_config.json', 'project'),
			antigravityMcp('.gemini/config/mcp_config.json', 'global'),
			antigravityHooks('.agents/hooks.json', 'project'),
			antigravityHooks('.gemini/config/hooks.json', 'global'),
			{
				glob: '.gemini/antigravity-cli/settings.json',
				placement: 'global',
				format: 'json',
				selectors: [OTHER_TOP_LEVEL_KEY],
				personalKeys: ['trustedWorkspaces']
			}
		],
		personalFiles: [],
		detection: {
			homePaths: ['.gemini/antigravity-cli', '.gemini/config'],
			cliCommands: ['agy']
		},
		scopes: ['project', 'global']
	}
];

/** Registry keyed by agent slug for O(1) lookup. */
export const AGENTS_BY_SLUG: Readonly<Record<string, AgentDefinition>> = Object.fromEntries(
	AGENTS.map((a) => [a.slug, a])
);

/**
 * Paths read by several Agents. They get no Agent on detection; the owner picks
 * one of `readers` (or none) on the web.
 */
export const SHARED_GLOBS: SharedGlob[] = [
	{
		glob: 'AGENTS.md',
		placement: 'project',
		componentType: 'instruction',
		readers: ['codex', 'copilot', 'cursor', 'opencode', 'antigravity']
	},
	{
		glob: '.agents/skills/**',
		placement: 'project',
		componentType: 'skill',
		readers: ['codex', 'copilot', 'cursor', 'gemini', 'opencode', 'antigravity']
	},
	{
		// Antigravity isn't confirmed to read ~/.agents/skills (#399).
		glob: '.agents/skills/**',
		placement: 'global',
		componentType: 'skill',
		readers: ['codex', 'copilot', 'cursor', 'gemini', 'opencode']
	}
];

// ─── Helper functions ─────────────────────────────────────────────────────────

interface Location {
	placement: Placement;
	filePath: string;
	selector: Selector | null;
}

/** Parses a Setup path, accepting `\` separators. Undefined if it's not a valid path. */
function locate(path: string): Location | undefined {
	return parseSetupPath(path.replace(/\\/g, '/')) ?? undefined;
}

function globsAt(agent: AgentDefinition, placement: Placement): FilePatternMapping[] {
	return placement === 'global' ? agent.globalGlobs : agent.projectGlobs;
}

function findSettingsFile(
	loc: Location
): { agent: AgentDefinition; file: SettingsFileDef } | undefined {
	for (const agent of AGENTS) {
		for (const file of agent.settingsFiles) {
			if (file.placement === loc.placement && matchesGlob(loc.filePath, file.glob)) {
				return { agent, file };
			}
		}
	}
	return undefined;
}

function findSharedGlob(loc: Location): SharedGlob | undefined {
	return SHARED_GLOBS.find(
		(s) => s.placement === loc.placement && matchesGlob(loc.filePath, s.glob)
	);
}

function isPersonal(loc: Location): boolean {
	return AGENTS.some((a) =>
		a.personalFiles.some((p) => p.placement === loc.placement && matchesGlob(loc.filePath, p.glob))
	);
}

/**
 * The Settings file a path points into, with or without a `#selector`
 * (`.mcp.json`, `~/.claude/settings.json#hooks…`), or undefined.
 */
export function getSettingsFile(path: string): SettingsFileDef | undefined {
	const loc = locate(path);
	return loc && findSettingsFile(loc)?.file;
}

function isSingleWildcard(pattern: string): boolean {
	return /^<[^<>]+>$/.test(pattern);
}

/**
 * The offered selector a fragment path matches, or undefined when its host
 * isn't a Settings file, the selector isn't offered there, or it names a
 * personal key. This is the server's `INVALID_SELECTOR` check (Decided #7).
 */
export function getOfferedSelector(path: string): OfferedSelector | undefined {
	const loc = locate(path);
	if (!loc?.selector) return undefined;
	const host = findSettingsFile(loc);
	if (!host) return undefined;
	const { file } = host;

	const head = loc.selector[0];
	if (head.kind !== 'key') return undefined;
	if (GENERIC_PERSONAL_KEY.test(head.key) || file.personalKeys.includes(head.key)) {
		return undefined;
	}
	if (file.template && Object.hasOwn(file.template, head.key)) {
		// Structural keys written by the template are never shipped on their own...
		if (loc.selector.length === 1) return undefined;
	}

	// ...and "any other top-level key" excludes keys that specific patterns own.
	const ownedHeads = new Set(
		file.selectors
			.filter((s) => !isSingleWildcard(s.pattern))
			.map((s) => s.pattern.split(/[.[]/)[0])
	);
	return file.selectors.find((s) => {
		if (isSingleWildcard(s.pattern) && ownedHeads.has(head.key)) return false;
		return selectorMatchesPattern(loc.selector!, s.pattern);
	});
}

/**
 * The Agent that detection credits a path to: the first Agent in registry order
 * whose globs match at the path's Placement (`~/` paths use `globalGlobs`), or
 * the owner of a fragment's Settings file. Undefined for shared paths, whole
 * Settings files and unknown paths.
 */
export function getAgentForFile(path: string): AgentDefinition | undefined {
	const loc = locate(path);
	if (!loc) return undefined;
	if (loc.selector) return getOfferedSelector(path) ? findSettingsFile(loc)?.agent : undefined;
	if (findSharedGlob(loc)) return undefined;
	return AGENTS.find((a) =>
		globsAt(a, loc.placement).some((m) => matchesGlob(loc.filePath, m.glob))
	);
}

/**
 * The ComponentType detection gives a path: the shared glob's, the first
 * matching Agent glob's, or a fragment's offered selector's. Undefined for
 * whole Settings files and unknown paths.
 */
export function getComponentTypeForFile(path: string): ComponentType | undefined {
	const loc = locate(path);
	if (!loc) return undefined;
	if (loc.selector) return getOfferedSelector(path)?.componentType;
	const shared = findSharedGlob(loc);
	if (shared) return shared.componentType;
	for (const agent of AGENTS) {
		const match = globsAt(agent, loc.placement).find((m) => matchesGlob(loc.filePath, m.glob));
		if (match) return match.componentType;
	}
	return undefined;
}

/**
 * The Agents a path may be classified as (spec §4, #400): every Agent whose
 * globs match at its Placement, plus the readers of a matching shared glob.
 * A fragment gets its Settings file's owner and readers (Decided #11). In
 * registry order. One result means the Agent is locked; none means none.
 */
export function allowedAgentsFor(path: string): AgentSlug[] {
	const loc = locate(path);
	if (!loc) return [];

	const allowed = new Set<AgentSlug>();
	if (loc.selector) {
		const host = findSettingsFile(loc);
		if (host && getOfferedSelector(path)) {
			allowed.add(host.agent.slug);
			for (const r of host.file.readers ?? []) allowed.add(r);
		}
	} else if (!findSettingsFile(loc)) {
		for (const agent of AGENTS) {
			if (globsAt(agent, loc.placement).some((m) => matchesGlob(loc.filePath, m.glob))) {
				allowed.add(agent.slug);
			}
		}
		for (const r of findSharedGlob(loc)?.readers ?? []) allowed.add(r);
	}
	return AGENTS.map((a) => a.slug).filter((s) => allowed.has(s));
}

/**
 * The `~/` allowlist (Decided #6): true only for a home path whose file part
 * an Agent reads there (a global glob, a shared global glob, or a global
 * Settings file) and that isn't a personal file. False for project paths,
 * so a Setup can't write `~/.ssh/authorized_keys` or `~/.bashrc`.
 */
export function isAllowedHomePath(path: string): boolean {
	const loc = locate(path);
	if (!loc || loc.placement !== 'global' || isPersonal(loc)) return false;
	if (loc.selector) return findSettingsFile(loc) !== undefined;
	return (
		findSharedGlob(loc) !== undefined ||
		findSettingsFile(loc) !== undefined ||
		AGENTS.some((a) => a.globalGlobs.some((m) => matchesGlob(loc.filePath, m.glob)))
	);
}

/** True for files that are never candidates (`.claude/settings.local.json`, `~/.claude.json`). */
export function isPersonalFile(path: string): boolean {
	const loc = locate(path);
	return loc !== undefined && isPersonal(loc);
}
