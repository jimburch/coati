/**
 * @coati/agents-registry
 *
 * Definitions for all supported AI coding agents: metadata, file detection
 * globs, machine detection rules, valid scopes, and component type mappings.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComponentType = 'instruction' | 'command' | 'skill' | 'mcp_server' | 'hook';
export type Scope = 'project' | 'global';

/** Maps a glob pattern to the component type it represents. */
export interface FilePatternMapping {
	/** Glob pattern relative to the project root (projectGlobs) or home dir (globalGlobs). */
	glob: string;
	componentType: ComponentType;
}

/** Rules for detecting whether an agent is installed on the user's machine. */
export interface DetectionRule {
	/** Home-relative paths to check for existence (e.g. ".claude" → ~/.claude). */
	homePaths: string[];
	/** CLI command names to check on PATH (e.g. "claude"). */
	cliCommands: string[];
}

/** Full definition for one AI coding agent. */
export interface AgentDefinition {
	slug: string;
	displayName: string;
	/** Icon filename (stored in the web app's static/icons/ directory). */
	icon: string;
	website: string;
	/** True when the agent is made by its official vendor/company. */
	official: boolean;
	/** Glob patterns for config files that live inside a project directory. */
	projectGlobs: FilePatternMapping[];
	/** Glob patterns for config files that live in the user's home directory. */
	globalGlobs: FilePatternMapping[];
	detection: DetectionRule;
	/** Which installation scopes this agent supports. */
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
			{ glob: '.claude/settings.json', componentType: 'instruction' },
			{ glob: '.claude/commands/**/*.md', componentType: 'command' },
			{ glob: '.claude/hooks/**/*', componentType: 'hook' },
			{ glob: '.claude/skills/**/*.md', componentType: 'skill' },
			{ glob: '.mcp.json', componentType: 'mcp_server' }
		],
		globalGlobs: [
			{ glob: '.claude/settings.json', componentType: 'instruction' },
			{ glob: '.claude/CLAUDE.md', componentType: 'instruction' },
			{ glob: '.claude/commands/**/*.md', componentType: 'command' },
			{ glob: '.claude/hooks/**/*', componentType: 'hook' },
			{ glob: '.claude/skills/**/*.md', componentType: 'skill' }
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
			{ glob: 'AGENTS.md', componentType: 'instruction' },
			{ glob: '.codex/config.toml', componentType: 'instruction' },
			{ glob: '.codex/agents/**/*.toml', componentType: 'instruction' }
		],
		globalGlobs: [{ glob: '.codex/config.toml', componentType: 'instruction' }],
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
			{ glob: '.github/copilot/instructions.md', componentType: 'instruction' },
			{ glob: '.github/copilot/mcp.json', componentType: 'mcp_server' },
			{ glob: '.github/copilot/agents.json', componentType: 'instruction' },
			{ glob: '.github/copilot/firewall.json', componentType: 'instruction' },
			{ glob: '.github/copilot/setup.sh', componentType: 'hook' },
			{ glob: '.github/copilot/prompts/**/*.md', componentType: 'command' },
			{ glob: '.vscode/settings.json', componentType: 'instruction' }
		],
		globalGlobs: [],
		detection: {
			homePaths: [],
			cliCommands: ['gh']
		},
		scopes: ['project']
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
			{ glob: '.cursorindexingignore', componentType: 'instruction' },
			{ glob: '.cursor/rules/**/*.mdc', componentType: 'instruction' },
			{ glob: '.cursor/rules/**/*.md', componentType: 'instruction' },
			{ glob: '.cursor/mcp.json', componentType: 'mcp_server' },
			{ glob: '.cursor/hooks.json', componentType: 'hook' },
			{ glob: '.cursor/commands/**/*.md', componentType: 'command' },
			{ glob: '.cursor/skills/**/*.md', componentType: 'skill' }
		],
		globalGlobs: [
			{ glob: '.cursor/rules/**/*.mdc', componentType: 'instruction' },
			{ glob: '.cursor/settings.json', componentType: 'instruction' }
		],
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
			{ glob: '.gemini/settings.json', componentType: 'instruction' },
			{ glob: '.gemini/commands/**/*.toml', componentType: 'command' },
			{ glob: '.gemini/skills/**/*.md', componentType: 'skill' },
			{ glob: '.gemini/policies/**/*.toml', componentType: 'instruction' }
		],
		globalGlobs: [{ glob: '.gemini/settings.json', componentType: 'instruction' }],
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
			{ glob: 'opencode.md', componentType: 'instruction' },
			{ glob: '.opencode.json', componentType: 'instruction' },
			{ glob: '.opencode/commands/**/*.md', componentType: 'command' }
		],
		globalGlobs: [{ glob: '.config/opencode/config.json', componentType: 'instruction' }],
		detection: {
			homePaths: ['.config/opencode'],
			cliCommands: ['opencode']
		},
		scopes: ['project', 'global']
	}
];

/** Registry keyed by agent slug for O(1) lookup. */
export const AGENTS_BY_SLUG: Readonly<Record<string, AgentDefinition>> = Object.fromEntries(
	AGENTS.map((a) => [a.slug, a])
);

/**
 * Glob patterns that are detected but not owned by any single agent — files
 * matching these are treated as "shared" across agents (no agent assignment).
 *
 * Examples: `.agents/skills/**` is produced by Vercel's skills.sh tool and is
 * consumable by any AI agent, so it belongs in the Shared group rather than
 * being misattributed to Codex (or whichever agent happened to claim it first).
 */
export const SHARED_GLOBS: FilePatternMapping[] = [
	{ glob: '.agents/skills/**/*.md', componentType: 'skill' }
];

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Given a project-relative file path, return the agent whose projectGlobs
 * match it, or `undefined` if no agent claims the file.
 *
 * The first matching agent (in registry order) wins.
 */
export function getAgentForFile(filePath: string): AgentDefinition | undefined {
	const normalized = filePath.replace(/\\/g, '/');
	for (const agent of AGENTS) {
		for (const mapping of agent.projectGlobs) {
			if (matchesGlob(normalized, mapping.glob)) {
				return agent;
			}
		}
	}
	return undefined;
}

/**
 * Given a project-relative file path, return the ComponentType inferred from
 * the matching agent's projectGlobs or SHARED_GLOBS, or `undefined` if no
 * pattern matches. Shared globs are checked first so that cross-agent paths
 * aren't falsely attributed to whichever agent happens to match them.
 */
export function getComponentTypeForFile(filePath: string): ComponentType | undefined {
	const normalized = filePath.replace(/\\/g, '/');
	for (const mapping of SHARED_GLOBS) {
		if (matchesGlob(normalized, mapping.glob)) {
			return mapping.componentType;
		}
	}
	for (const agent of AGENTS) {
		for (const mapping of agent.projectGlobs) {
			if (matchesGlob(normalized, mapping.glob)) {
				return mapping.componentType;
			}
		}
	}
	return undefined;
}
