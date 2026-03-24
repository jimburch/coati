import fs from 'fs';
import path from 'path';
import type { ManifestComponentType, ManifestPlacement } from './manifest.js';

export interface DetectedFile {
	source: string;
	target: string;
	placement: ManifestPlacement;
	componentType: ManifestComponentType;
	tool: string;
	description: string;
}

interface FilePattern {
	tool: string;
	description: (relativePath: string) => string;
	matches: (relativePath: string) => boolean;
	getTarget: (relativePath: string) => string;
	placement: ManifestPlacement;
	componentType: ManifestComponentType;
}

/**
 * Registry of known AI config file patterns.
 * To add support for a new AI tool, add entries here — no detection logic changes needed.
 */
const PATTERNS: FilePattern[] = [
	// ─── Claude Code ─────────────────────────────────────────────────────────

	{
		tool: 'claude-code',
		description: () => 'Claude Code settings',
		matches: (p) => p === '.claude/settings.json',
		getTarget: () => '~/.claude/settings.json',
		placement: 'global',
		componentType: 'instruction'
	},
	{
		tool: 'claude-code',
		description: () => 'Claude Code global instructions',
		matches: (p) => p === '.claude/CLAUDE.md',
		getTarget: () => '~/.claude/CLAUDE.md',
		placement: 'global',
		componentType: 'instruction'
	},
	{
		tool: 'claude-code',
		description: () => 'Claude Code project instructions',
		matches: (p) => p === 'CLAUDE.md',
		getTarget: () => 'CLAUDE.md',
		placement: 'project',
		componentType: 'instruction'
	},
	{
		tool: 'claude-code',
		description: (p) => `Claude Code command: ${path.basename(p, path.extname(p))}`,
		matches: (p) => p.startsWith('.claude/commands/') && p.endsWith('.md'),
		getTarget: (p) => `~/.claude/commands/${p.slice('.claude/commands/'.length)}`,
		placement: 'global',
		componentType: 'command'
	},
	{
		tool: 'claude-code',
		description: (p) => `Claude Code skill: ${path.basename(p, path.extname(p))}`,
		matches: (p) => p.startsWith('.claude/skills/') && p.endsWith('.md'),
		getTarget: (p) => `~/.claude/skills/${p.slice('.claude/skills/'.length)}`,
		placement: 'global',
		componentType: 'skill'
	},
	{
		tool: 'claude-code',
		description: (p) => `Claude Code hook: ${path.basename(p)}`,
		matches: (p) => p.startsWith('.claude/hooks/'),
		getTarget: (p) => `~/.claude/hooks/${p.slice('.claude/hooks/'.length)}`,
		placement: 'global',
		componentType: 'hook'
	},

	// ─── Cursor ───────────────────────────────────────────────────────────────

	{
		tool: 'cursor',
		description: (p) => `Cursor rule: ${path.basename(p)}`,
		matches: (p) => p.startsWith('.cursor/rules/') && (p.endsWith('.md') || p.endsWith('.mdc')),
		getTarget: (p) => `.cursor/rules/${p.slice('.cursor/rules/'.length)}`,
		placement: 'project',
		componentType: 'instruction'
	},
	{
		tool: 'cursor',
		description: () => 'Cursor rules (legacy)',
		matches: (p) => p === '.cursorrules',
		getTarget: () => '.cursorrules',
		placement: 'project',
		componentType: 'instruction'
	},

	// ─── MCP ─────────────────────────────────────────────────────────────────

	{
		tool: 'mcp',
		description: () => 'MCP server configuration',
		matches: (p) => p === '.mcp.json',
		getTarget: () => '.mcp.json',
		placement: 'project',
		componentType: 'mcp_server'
	},
	{
		tool: 'mcp',
		description: () => 'MCP server configuration',
		matches: (p) => p === 'mcp.json',
		getTarget: () => 'mcp.json',
		placement: 'project',
		componentType: 'mcp_server'
	},

	// ─── GitHub Copilot ───────────────────────────────────────────────────────

	{
		tool: 'github-copilot',
		description: () => 'GitHub Copilot instructions',
		matches: (p) => p === '.github/copilot-instructions.md',
		getTarget: () => '.github/copilot-instructions.md',
		placement: 'project',
		componentType: 'instruction'
	},
	{
		tool: 'github-copilot',
		description: (p) => `GitHub Copilot instruction: ${path.basename(p)}`,
		matches: (p) => p.startsWith('.github/copilot/') && p.endsWith('.md'),
		getTarget: (p) => `.github/copilot/${p.slice('.github/copilot/'.length)}`,
		placement: 'project',
		componentType: 'instruction'
	},

	// ─── OpenAI Agents ────────────────────────────────────────────────────────

	{
		tool: 'openai-agents',
		description: () => 'OpenAI Agents instructions',
		matches: (p) => p === 'AGENTS.md',
		getTarget: () => 'AGENTS.md',
		placement: 'project',
		componentType: 'instruction'
	}
];

/** Directories to skip during recursive scanning. */
const SKIP_DIRS = new Set([
	'node_modules',
	'.git',
	'dist',
	'build',
	'.next',
	'.nuxt',
	'.svelte-kit',
	'__pycache__',
	'.venv',
	'venv'
]);

function walkDir(dir: string, baseDir: string): string[] {
	const results: string[] = [];
	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return results;
	}
	for (const entry of entries) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walkDir(fullPath, baseDir));
		} else if (entry.isFile()) {
			// Normalize to forward slashes for cross-platform pattern matching
			results.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
		}
	}
	return results;
}

/**
 * Scan `dir` for known AI config files and return detected files with
 * suggested target paths, placements, and component types.
 */
export function detectFiles(dir: string): DetectedFile[] {
	const allFiles = walkDir(dir, dir);
	const detected: DetectedFile[] = [];

	for (const relativePath of allFiles) {
		for (const pattern of PATTERNS) {
			if (pattern.matches(relativePath)) {
				detected.push({
					source: relativePath,
					target: pattern.getTarget(relativePath),
					placement: pattern.placement,
					componentType: pattern.componentType,
					tool: pattern.tool,
					description: pattern.description(relativePath)
				});
				break; // First matching pattern wins
			}
		}
	}

	return detected;
}
