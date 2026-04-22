// Pure logic for SetupFileList component — extracted for testability.

export interface SetupFileLike {
	id: string;
	path: string;
	description: string | null;
	agent: string | null;
}

export interface AgentLike {
	id: string;
	slug: string;
	displayName: string;
}

// ─── Node types ──────────────────────────────────────────────────────────────

export type RootFileNode = {
	kind: 'root-file';
	file: SetupFileLike;
};

export type SingleFileFolderNode = {
	kind: 'single-file-folder';
	file: SetupFileLike;
	/** Directory prefix including trailing slash, e.g. "hooks/" */
	folder: string;
	/** Bare filename without directory, e.g. "pre-commit.sh" */
	filename: string;
};

export type MultiFileFolderNode = {
	kind: 'multi-file-folder';
	/** Directory prefix including trailing slash, e.g. "hooks/" */
	folder: string;
	files: SetupFileLike[];
};

export type FileNode = RootFileNode | SingleFileFolderNode | MultiFileFolderNode;

export type AgentGroup = {
	agentSlug: string | null;
	displayName: string;
	nodes: FileNode[];
	/** Total number of leaf files in this group. */
	totalFiles: number;
};

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the directory prefix of a path (including trailing slash), or null
 * for root-level files (no directory component).
 *
 * "hooks/pre-commit.sh"      → "hooks/"
 * "some/deep/path/file.sh"   → "some/deep/path/"
 * "file.sh"                  → null
 */
export function getFolder(path: string): string | null {
	const lastSlash = path.lastIndexOf('/');
	if (lastSlash === -1) return null;
	return path.slice(0, lastSlash + 1);
}

/**
 * Returns the bare filename of a path (everything after the last slash).
 *
 * "hooks/pre-commit.sh"  → "pre-commit.sh"
 * "file.sh"              → "file.sh"
 */
export function getFilename(path: string): string {
	const lastSlash = path.lastIndexOf('/');
	if (lastSlash === -1) return path;
	return path.slice(lastSlash + 1);
}

// ─── Hierarchy ────────────────────────────────────────────────────────────────

/**
 * Converts a flat list of files into a smart hybrid hierarchy:
 *   - Root files (no directory) → RootFileNode (shown directly)
 *   - Single-file folders       → SingleFileFolderNode (inline dimmed prefix)
 *   - Multi-file folders        → MultiFileFolderNode (collapsible sub-group)
 *
 * Grouping is by immediate parent directory (one level of nesting).
 */
export function computeFileHierarchy(files: SetupFileLike[]): FileNode[] {
	const folderMap = new Map<string, SetupFileLike[]>();
	const rootFiles: SetupFileLike[] = [];

	for (const file of files) {
		const folder = getFolder(file.path);
		if (folder === null) {
			rootFiles.push(file);
		} else {
			const bucket = folderMap.get(folder);
			if (bucket) {
				bucket.push(file);
			} else {
				folderMap.set(folder, [file]);
			}
		}
	}

	const nodes: FileNode[] = [];

	// Root files first
	for (const file of rootFiles) {
		nodes.push({ kind: 'root-file', file });
	}

	// Then folders (single-file inline, multi-file collapsible)
	for (const [folder, folderFiles] of folderMap) {
		if (folderFiles.length === 1) {
			nodes.push({
				kind: 'single-file-folder',
				file: folderFiles[0],
				folder,
				filename: getFilename(folderFiles[0].path)
			});
		} else {
			nodes.push({ kind: 'multi-file-folder', folder, files: folderFiles });
		}
	}

	return nodes;
}

// ─── Agent grouping ───────────────────────────────────────────────────────────

/**
 * Groups files by agent, ordered by the agents array, with a "Shared" group
 * (null agent) appended last.  Agents with zero files are omitted.
 */
export function groupFilesByAgent(files: SetupFileLike[], agents: AgentLike[]): AgentGroup[] {
	// Bucket files by agent slug (null = shared)
	const buckets = new Map<string | null, SetupFileLike[]>();
	for (const file of files) {
		const key = file.agent ?? null;
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.push(file);
		} else {
			buckets.set(key, [file]);
		}
	}

	const groups: AgentGroup[] = [];

	// Agent groups in the order provided by the agents array
	for (const agent of agents) {
		const agentFiles = buckets.get(agent.slug);
		if (agentFiles && agentFiles.length > 0) {
			groups.push({
				agentSlug: agent.slug,
				displayName: agent.displayName,
				nodes: computeFileHierarchy(agentFiles),
				totalFiles: agentFiles.length
			});
		}
	}

	// Shared (agent-less) group last
	const sharedFiles = buckets.get(null);
	if (sharedFiles && sharedFiles.length > 0) {
		groups.push({
			agentSlug: null,
			displayName: 'Shared',
			nodes: computeFileHierarchy(sharedFiles),
			totalFiles: sharedFiles.length
		});
	}

	return groups;
}

// ─── Collapse threshold ───────────────────────────────────────────────────────

/** Returns true when sub-folders should start expanded. */
export function shouldStartExpanded(totalFiles: number): boolean {
	return totalFiles <= 10;
}

/**
 * Initial expand state for an agent group header.  Agent-specific groups
 * always start expanded; the Shared group collapses only when there's more
 * than one group on screen.
 */
export function initialGroupExpanded(groupKey: string, totalGroups: number): boolean {
	if (groupKey === '__shared') return totalGroups === 1;
	return true;
}

/** Returns true when every file in the list has no agent assigned. */
export function allFilesAgentless(files: SetupFileLike[]): boolean {
	return files.length > 0 && files.every((f) => !f.agent);
}
