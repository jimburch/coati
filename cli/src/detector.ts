import fs from 'fs';
import path from 'path';
import { AGENTS, matchesGlob } from '@coati/agents-registry';
import type { ManifestComponentType } from './manifest.js';

export interface DetectedFile {
	path: string;
	componentType: ManifestComponentType;
	/** Agent slug from @coati/agents-registry (e.g. 'claude-code', 'cursor'). */
	tool: string;
	description: string;
}

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
	const allFiles = walkDir(dir, dir);
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
