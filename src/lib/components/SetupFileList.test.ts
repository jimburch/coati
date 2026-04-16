import { describe, it, expect } from 'vitest';
import {
	getFolder,
	getFilename,
	computeFileHierarchy,
	groupFilesByAgent,
	shouldStartExpanded,
	allFilesAgentless
} from './SetupFileList.utils';
import type { SetupFileLike, AgentLike } from './SetupFileList.utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(
	path: string,
	agent: string | null = null,
	description: string | null = null
): SetupFileLike {
	return { id: path, path, description, agent };
}

function makeAgent(slug: string, displayName: string = slug): AgentLike {
	return { id: slug, slug, displayName };
}

// ─── getFolder ────────────────────────────────────────────────────────────────

describe('getFolder', () => {
	it('returns null for a root-level file with no directory', () => {
		expect(getFolder('file.sh')).toBeNull();
	});

	it('returns folder with trailing slash for a one-level nested file', () => {
		expect(getFolder('hooks/pre-commit.sh')).toBe('hooks/');
	});

	it('returns full directory path (with trailing slash) for a deeply nested file', () => {
		expect(getFolder('some/deep/path/file.sh')).toBe('some/deep/path/');
	});

	it('handles a single-character folder name', () => {
		expect(getFolder('a/b.sh')).toBe('a/');
	});

	it('handles dotfiles in folders', () => {
		expect(getFolder('.claude/settings.json')).toBe('.claude/');
	});
});

// ─── getFilename ──────────────────────────────────────────────────────────────

describe('getFilename', () => {
	it('returns the full path for a root-level file', () => {
		expect(getFilename('file.sh')).toBe('file.sh');
	});

	it('returns just the filename for a one-level nested file', () => {
		expect(getFilename('hooks/pre-commit.sh')).toBe('pre-commit.sh');
	});

	it('returns just the filename for a deeply nested file', () => {
		expect(getFilename('some/deep/path/file.sh')).toBe('file.sh');
	});

	it('handles dotfiles', () => {
		expect(getFilename('.claude/settings.json')).toBe('settings.json');
	});

	it('preserves dotfile names at root', () => {
		expect(getFilename('.gitignore')).toBe('.gitignore');
	});
});

// ─── computeFileHierarchy ─────────────────────────────────────────────────────

describe('computeFileHierarchy', () => {
	it('returns empty array for empty input', () => {
		expect(computeFileHierarchy([])).toEqual([]);
	});

	it('creates root-file node for a file with no directory', () => {
		const files = [makeFile('file.sh')];
		const nodes = computeFileHierarchy(files);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].kind).toBe('root-file');
		if (nodes[0].kind === 'root-file') {
			expect(nodes[0].file.path).toBe('file.sh');
		}
	});

	it('creates single-file-folder node for a folder containing one file', () => {
		const files = [makeFile('hooks/pre-commit.sh')];
		const nodes = computeFileHierarchy(files);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].kind).toBe('single-file-folder');
		if (nodes[0].kind === 'single-file-folder') {
			expect(nodes[0].folder).toBe('hooks/');
			expect(nodes[0].filename).toBe('pre-commit.sh');
			expect(nodes[0].file.path).toBe('hooks/pre-commit.sh');
		}
	});

	it('creates multi-file-folder node for a folder containing multiple files', () => {
		const files = [makeFile('hooks/pre-commit.sh'), makeFile('hooks/post-commit.sh')];
		const nodes = computeFileHierarchy(files);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].kind).toBe('multi-file-folder');
		if (nodes[0].kind === 'multi-file-folder') {
			expect(nodes[0].folder).toBe('hooks/');
			expect(nodes[0].files).toHaveLength(2);
		}
	});

	it('places root files before folder nodes', () => {
		const files = [makeFile('hooks/pre-commit.sh'), makeFile('root.sh')];
		const nodes = computeFileHierarchy(files);
		expect(nodes[0].kind).toBe('root-file');
	});

	it('groups files sharing the same immediate parent directory', () => {
		const files = [
			makeFile('hooks/pre-commit.sh'),
			makeFile('hooks/post-commit.sh'),
			makeFile('scripts/build.sh')
		];
		const nodes = computeFileHierarchy(files);

		const multiFolder = nodes.find((n) => n.kind === 'multi-file-folder');
		const singleFolder = nodes.find((n) => n.kind === 'single-file-folder');
		expect(multiFolder).toBeDefined();
		expect(singleFolder).toBeDefined();

		if (multiFolder?.kind === 'multi-file-folder') {
			expect(multiFolder.folder).toBe('hooks/');
			expect(multiFolder.files).toHaveLength(2);
		}
		if (singleFolder?.kind === 'single-file-folder') {
			expect(singleFolder.folder).toBe('scripts/');
		}
	});

	it('uses the immediate parent (leaf directory) for grouping, not top-level dir', () => {
		// Two files in the same leaf directory → multi-file-folder
		const files = [makeFile('a/b/c/file1.sh'), makeFile('a/b/c/file2.sh')];
		const nodes = computeFileHierarchy(files);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].kind).toBe('multi-file-folder');
		if (nodes[0].kind === 'multi-file-folder') {
			expect(nodes[0].folder).toBe('a/b/c/');
		}
	});

	it('treats files in different leaf directories as separate groups', () => {
		const files = [makeFile('a/b/file1.sh'), makeFile('a/c/file2.sh')];
		const nodes = computeFileHierarchy(files);
		// Each leaf dir has one file → two single-file-folder nodes
		expect(nodes).toHaveLength(2);
		expect(nodes.every((n) => n.kind === 'single-file-folder')).toBe(true);
	});

	it('handles multiple root files', () => {
		const files = [makeFile('a.sh'), makeFile('b.sh'), makeFile('c.sh')];
		const nodes = computeFileHierarchy(files);
		expect(nodes).toHaveLength(3);
		expect(nodes.every((n) => n.kind === 'root-file')).toBe(true);
	});
});

// ─── groupFilesByAgent ────────────────────────────────────────────────────────

describe('groupFilesByAgent', () => {
	it('returns empty array when files is empty', () => {
		expect(groupFilesByAgent([], [])).toEqual([]);
	});

	it('creates one group per agent that has files', () => {
		const files = [makeFile('a.sh', 'claude'), makeFile('b.sh', 'copilot')];
		const agents = [makeAgent('claude'), makeAgent('copilot')];
		const groups = groupFilesByAgent(files, agents);
		expect(groups).toHaveLength(2);
	});

	it('orders groups by the agents array order', () => {
		const files = [makeFile('a.sh', 'copilot'), makeFile('b.sh', 'claude')];
		const agents = [makeAgent('claude'), makeAgent('copilot')];
		const groups = groupFilesByAgent(files, agents);
		expect(groups[0].agentSlug).toBe('claude');
		expect(groups[1].agentSlug).toBe('copilot');
	});

	it('puts the shared (null-agent) group last', () => {
		const files = [makeFile('shared.sh', null), makeFile('agent.sh', 'claude')];
		const agents = [makeAgent('claude')];
		const groups = groupFilesByAgent(files, agents);
		const last = groups[groups.length - 1];
		expect(last.agentSlug).toBeNull();
	});

	it('gives the shared group a displayName of "Shared"', () => {
		const files = [makeFile('shared.sh', null)];
		const groups = groupFilesByAgent(files, []);
		expect(groups[0].displayName).toBe('Shared');
	});

	it('omits agents that have no matching files', () => {
		const files = [makeFile('a.sh', 'claude')];
		const agents = [makeAgent('claude'), makeAgent('copilot')];
		const groups = groupFilesByAgent(files, agents);
		expect(groups).toHaveLength(1);
		expect(groups[0].agentSlug).toBe('claude');
	});

	it('totalFiles reflects leaf-file count for the group', () => {
		const files = [
			makeFile('a.sh', 'claude'),
			makeFile('b.sh', 'claude'),
			makeFile('c.sh', 'claude')
		];
		const agents = [makeAgent('claude')];
		const groups = groupFilesByAgent(files, agents);
		expect(groups[0].totalFiles).toBe(3);
	});

	it('handles a setup with all agent-less files', () => {
		const files = [makeFile('a.sh', null), makeFile('b.sh', null)];
		const groups = groupFilesByAgent(files, []);
		expect(groups).toHaveLength(1);
		expect(groups[0].agentSlug).toBeNull();
		expect(groups[0].totalFiles).toBe(2);
	});

	it('nodes within each group use the smart hierarchy', () => {
		const files = [
			makeFile('hooks/pre-commit.sh', 'claude'),
			makeFile('hooks/post-commit.sh', 'claude')
		];
		const agents = [makeAgent('claude')];
		const groups = groupFilesByAgent(files, agents);
		expect(groups[0].nodes[0].kind).toBe('multi-file-folder');
	});
});

// ─── shouldStartExpanded ──────────────────────────────────────────────────────

describe('shouldStartExpanded', () => {
	it('returns true for 0 files', () => {
		expect(shouldStartExpanded(0)).toBe(true);
	});

	it('returns true when total files is less than 10', () => {
		expect(shouldStartExpanded(5)).toBe(true);
	});

	it('returns true when total files is exactly 10', () => {
		expect(shouldStartExpanded(10)).toBe(true);
	});

	it('returns false when total files is 11', () => {
		expect(shouldStartExpanded(11)).toBe(false);
	});

	it('returns false for large file counts', () => {
		expect(shouldStartExpanded(50)).toBe(false);
	});
});

// ─── allFilesAgentless ────────────────────────────────────────────────────────

describe('allFilesAgentless', () => {
	it('returns false for an empty array', () => {
		expect(allFilesAgentless([])).toBe(false);
	});

	it('returns true when every file has no agent', () => {
		const files = [makeFile('a.sh', null), makeFile('b.sh', null)];
		expect(allFilesAgentless(files)).toBe(true);
	});

	it('returns false when any file has an agent', () => {
		const files = [makeFile('a.sh', null), makeFile('b.sh', 'claude')];
		expect(allFilesAgentless(files)).toBe(false);
	});

	it('returns false when all files have an agent', () => {
		const files = [makeFile('a.sh', 'claude'), makeFile('b.sh', 'claude')];
		expect(allFilesAgentless(files)).toBe(false);
	});

	it('returns true for a single agent-less file', () => {
		expect(allFilesAgentless([makeFile('solo.sh', null)])).toBe(true);
	});
});
