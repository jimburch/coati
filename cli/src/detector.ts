import fs from 'fs';
import path from 'path';
import { AGENTS, matchesGlob, type AgentDefinition } from '@coati/agents-registry';
import type { ManifestComponentType } from './manifest.js';

export interface DetectedFile {
	path: string;
	componentType: ManifestComponentType;
	/** Agent slug from @coati/agents-registry (e.g. 'claude-code', 'cursor'). */
	tool: string;
	description: string;
}

/** Directories to skip during scanning (safety net). */
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

/**
 * Extract scan targets from the AGENTS registry.
 *
 * Returns:
 * - `rootFileGlobs`: globs with no directory component (e.g. "CLAUDE.md", ".mcp.json")
 *   — these are checked via direct `fs.existsSync` rather than directory walking.
 * - `dirPrefixes`: the first path segment of every directory-based glob
 *   (e.g. ".claude", ".cursor", ".config") — only these dirs are entered at the top level.
 */
function extractScanTargets(agents: AgentDefinition[]): {
	rootFileGlobs: string[];
	dirPrefixes: Set<string>;
} {
	const rootFileGlobs: string[] = [];
	const dirPrefixes = new Set<string>();

	for (const agent of agents) {
		for (const list of [agent.projectGlobs, agent.globalGlobs]) {
			for (const { glob } of list) {
				const slashIdx = glob.indexOf('/');
				if (slashIdx === -1) {
					// No directory component → root-level file pattern
					if (!rootFileGlobs.includes(glob)) {
						rootFileGlobs.push(glob);
					}
				} else {
					// Has directory component → extract first path segment
					dirPrefixes.add(glob.slice(0, slashIdx));
				}
			}
		}
	}

	return { rootFileGlobs, dirPrefixes };
}

/**
 * Iterative BFS directory walker.
 *
 * At the top level (`baseDir`), only enters directories whose name is in `dirPrefixes`.
 * Once inside a target directory, walks all subdirectories normally.
 * Skips symlinks, retains SKIP_DIRS as a safety net, and handles EACCES/EPERM gracefully.
 */
function collectDirFiles(baseDir: string, dirPrefixes: Set<string>): string[] {
	const results: string[] = [];
	// Queue entries: [absoluteDirPath, isTopLevel]
	const queue: Array<[string, boolean]> = [[baseDir, true]];

	while (queue.length > 0) {
		const [currentDir, isTopLevel] = queue.shift()!;

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(currentDir, { withFileTypes: true });
		} catch {
			// Gracefully skip unreadable directories (EACCES, EPERM, etc.)
			continue;
		}

		for (const entry of entries) {
			if (entry.isSymbolicLink()) continue;
			if (SKIP_DIRS.has(entry.name)) continue;

			const fullPath = path.join(currentDir, entry.name);

			if (entry.isDirectory()) {
				// At the top level, only enter directories matching known prefixes
				if (isTopLevel && !dirPrefixes.has(entry.name)) continue;
				queue.push([fullPath, false]);
			} else if (entry.isFile()) {
				// Normalize to forward slashes for cross-platform pattern matching
				results.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
			}
		}
	}

	return results;
}

function makeDescription(
	filePath: string,
	componentType: ManifestComponentType,
	agentName: string
): string {
	const basename = path.basename(filePath, path.extname(filePath));
	switch (componentType) {
		case 'command':
			return `${agentName} command: ${basename}`;
		case 'skill':
			return `${agentName} skill: ${basename}`;
		case 'hook':
			return `${agentName} hook: ${path.basename(filePath)}`;
		case 'mcp_server':
			return `${agentName} MCP server configuration`;
		default:
			return `${agentName} ${componentType}`;
	}
}

/**
 * Scan `dir` for known AI agent config files using the shared @coati/agents-registry.
 *
 * Each detected file gets a `path` entry (relative to the scanned directory).
 * Placement is determined at the setup level, not per-file — see ManifestPlacement.
 *
 * A single file may produce multiple DetectedFile entries when it matches
 * globs from more than one agent (e.g. a shared MCP config).
 *
 * Global globs are checked first; if matched, the file is not re-emitted for
 * the same agent's project globs (one entry per (file, agent) pair).
 */
export function detectFiles(dir: string): DetectedFile[] {
	const { rootFileGlobs, dirPrefixes } = extractScanTargets(AGENTS);

	// ── 1. Root-level files: direct existence checks (no walking needed) ─────
	const allFiles: string[] = [];
	for (const glob of rootFileGlobs) {
		if (fs.existsSync(path.join(dir, glob))) {
			allFiles.push(glob);
		}
	}

	// ── 2. Directory-based files: targeted iterative BFS walker ──────────────
	allFiles.push(...collectDirFiles(dir, dirPrefixes));

	const detected: DetectedFile[] = [];

	for (const relativePath of allFiles) {
		// Track which (path, agentSlug) pairs have already been emitted so that
		// a file matching both globalGlobs and projectGlobs for the same agent
		// only produces one entry.
		const emittedForAgent = new Set<string>();

		for (const agent of AGENTS) {
			const agentKey = `${relativePath}::${agent.slug}`;

			// ── 1. globalGlobs: files that install to the user's home directory ────
			for (const mapping of agent.globalGlobs) {
				if (matchesGlob(relativePath, mapping.glob)) {
					if (!emittedForAgent.has(agentKey)) {
						emittedForAgent.add(agentKey);
						const ct = mapping.componentType as ManifestComponentType;
						detected.push({
							path: relativePath,
							componentType: ct,
							tool: agent.slug,
							description: makeDescription(relativePath, ct, agent.displayName)
						});
					}
					break; // first matching glob wins within an agent's globalGlobs
				}
			}

			// ── 2. projectGlobs: files that install inside the project directory ──
			if (!emittedForAgent.has(agentKey)) {
				for (const mapping of agent.projectGlobs) {
					if (matchesGlob(relativePath, mapping.glob)) {
						emittedForAgent.add(agentKey);
						const ct = mapping.componentType as ManifestComponentType;
						detected.push({
							path: relativePath,
							componentType: ct,
							tool: agent.slug,
							description: makeDescription(relativePath, ct, agent.displayName)
						});
						break; // first matching glob wins within an agent's projectGlobs
					}
				}
			}
		}
	}

	return detected;
}
