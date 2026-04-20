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

// ─── getFolder / getFilename ──────────────────────────────────────────────────

describe('getFolder and getFilename', () => {
	it('splits paths into folder (with trailing slash, or null) and filename', () => {
		const cases: Array<[string, string | null, string]> = [
			['file.sh', null, 'file.sh'],
			['hooks/pre-commit.sh', 'hooks/', 'pre-commit.sh'],
			['some/deep/path/file.sh', 'some/deep/path/', 'file.sh'],
			['a/b.sh', 'a/', 'b.sh'],
			['.claude/settings.json', '.claude/', 'settings.json'],
			['.gitignore', null, '.gitignore']
		];
		for (const [path, folder, filename] of cases) {
			expect(getFolder(path), `getFolder(${path})`).toBe(folder);
			expect(getFilename(path), `getFilename(${path})`).toBe(filename);
		}
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
	it('is true for ≤10 files (including 0), false above the threshold', () => {
		expect(shouldStartExpanded(0)).toBe(true);
		expect(shouldStartExpanded(5)).toBe(true);
		expect(shouldStartExpanded(10)).toBe(true);
		expect(shouldStartExpanded(11)).toBe(false);
		expect(shouldStartExpanded(50)).toBe(false);
	});
});

// ─── allFilesAgentless ────────────────────────────────────────────────────────

describe('allFilesAgentless', () => {
	it('is true only when the list is non-empty and every file has no agent', () => {
		expect(allFilesAgentless([])).toBe(false);
		expect(allFilesAgentless([makeFile('solo.sh', null)])).toBe(true);
		expect(allFilesAgentless([makeFile('a.sh', null), makeFile('b.sh', null)])).toBe(true);
		expect(allFilesAgentless([makeFile('a.sh', null), makeFile('b.sh', 'claude')])).toBe(false);
		expect(allFilesAgentless([makeFile('a.sh', 'claude'), makeFile('b.sh', 'claude')])).toBe(false);
	});
});
