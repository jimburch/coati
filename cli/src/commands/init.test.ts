import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext } from '../test-utils.js';
import type { CommandContext } from '../context.js';

// ── mocks for pure utilities ──────────────────────────────────────────────────

const mockDetectFiles = vi.fn();

vi.mock('../detector.js', () => ({
	detectFiles: (dir: string) => mockDetectFiles(dir)
}));

const mockWriteManifest = vi.fn();

vi.mock('../manifest.js', () => ({
	writeManifest: (...args: unknown[]) => mockWriteManifest(...args),
	MANIFEST_FILENAME: 'coati.json'
}));

const mockFormatFileList = vi.fn();

vi.mock('../format.js', () => ({
	formatFileList: (...args: unknown[]) => mockFormatFileList(...args)
}));

// Import after mocks are registered
const { runInitFlow, computeDetectedAgents } = await import('./init.js');

// ── helpers ───────────────────────────────────────────────────────────────────

const DETECTED_FILES = [
	{
		path: 'CLAUDE.md',
		componentType: 'instruction' as const,
		tool: 'claude-code',
		description: 'Claude instruction file'
	},
	{
		path: '.claude/settings.json',
		componentType: 'config' as const,
		tool: 'claude-code',
		description: 'Claude settings'
	}
];

const MULTI_AGENT_FILES = [
	{
		path: 'CLAUDE.md',
		componentType: 'instruction' as const,
		tool: 'claude-code',
		description: 'Claude instruction file'
	},
	{
		path: '.claude/settings.json',
		componentType: 'config' as const,
		tool: 'claude-code',
		description: 'Claude settings'
	},
	{
		path: '.cursor/rules/main.mdc',
		componentType: 'instruction' as const,
		tool: 'cursor',
		description: 'Cursor rule'
	},
	{
		path: 'README.md',
		componentType: 'instruction' as const,
		tool: '',
		description: 'Shared README'
	}
];

const DEFAULT_METADATA = {
	name: 'my-setup',
	description: 'A test setup',
	category: 'general',
	agents: [] as string[],
	tags: ['test']
};

const CWD = '/fake/cwd';

let ctx: CommandContext;

beforeEach(() => {
	ctx = createTestContext();
	vi.clearAllMocks();

	vi.mocked(ctx.fs.existsSync).mockReturnValue(false);
	mockDetectFiles.mockReturnValue(DETECTED_FILES);
	vi.mocked(ctx.io.confirm).mockResolvedValue(true);
	// Default: checklist returns all detected file paths (all pre-selected, none deselected)
	vi.mocked(ctx.io.checklist).mockResolvedValue(DETECTED_FILES.map((f) => f.path));
	// Default: select returns 'project' for placement question
	vi.mocked(ctx.io.select).mockResolvedValue('project');
	mockFormatFileList.mockReturnValue('(formatted file list)');
	vi.mocked(ctx.io.promptMetadata).mockResolvedValue(DEFAULT_METADATA);
	mockWriteManifest.mockReturnValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── normal flow ───────────────────────────────────────────────────────────────

describe('runInitFlow — normal flow', () => {
	it('detects files, shows checklist, prompts metadata, writes manifest, returns true', async () => {
		const result = await runInitFlow(ctx, CWD);

		expect(mockDetectFiles).toHaveBeenCalledWith(CWD);
		expect(mockFormatFileList).toHaveBeenCalledWith(DETECTED_FILES);
		expect(ctx.io.checklist).toHaveBeenCalled();
		expect(ctx.io.promptMetadata).toHaveBeenCalled();
		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({
				name: 'my-setup',
				description: 'A test setup',
				files: expect.arrayContaining([expect.objectContaining({ path: 'CLAUDE.md' })])
			})
		);
		expect(result).toBe(true);
	});

	it('calls success after writing manifest', async () => {
		await runInitFlow(ctx, CWD);
		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('coati.json'));
	});

	it('asks a single placement question', async () => {
		await runInitFlow(ctx, CWD);
		expect(ctx.io.select).toHaveBeenCalledWith(
			expect.stringContaining('installed'),
			expect.arrayContaining([
				expect.objectContaining({ value: 'global' }),
				expect.objectContaining({ value: 'project' })
			])
		);
	});

	it('writes manifest with placement from select prompt', async () => {
		vi.mocked(ctx.io.select).mockResolvedValue('global');

		await runInitFlow(ctx, CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ placement: 'global' })
		);
	});

	it('defaults to project placement in JSON mode (no select prompt)', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);

		await runInitFlow(ctx, CWD);

		expect(ctx.io.select).not.toHaveBeenCalled();
		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.placement).toBe('project');
	});
});

// ── file picker checklist ─────────────────────────────────────────────────────

describe('runInitFlow — file picker checklist', () => {
	it('calls checklist with all detected files pre-selected', async () => {
		await runInitFlow(ctx, CWD);

		expect(ctx.io.checklist).toHaveBeenCalledWith(
			expect.any(String),
			DETECTED_FILES.map((f) => ({ label: f.path, value: f.path })),
			DETECTED_FILES.map((f) => f.path),
			1
		);
	});

	it('excludes deselected files from the generated manifest', async () => {
		// User deselects the second file (.claude/settings.json)
		vi.mocked(ctx.io.checklist).mockResolvedValueOnce(['CLAUDE.md']);

		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.files).toHaveLength(1);
		expect(writtenManifest.files[0].path).toBe('CLAUDE.md');
	});

	it('returns false and shows error when no files selected', async () => {
		vi.mocked(ctx.io.checklist).mockResolvedValueOnce([]);

		const result = await runInitFlow(ctx, CWD);

		expect(result).toBe(false);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('At least 1 file'));
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('prints edit hint after writing manifest', async () => {
		await runInitFlow(ctx, CWD);

		expect(ctx.io.info).toHaveBeenCalledWith(
			expect.stringContaining('Edit coati.json to adjust files')
		);
	});
});

// ── user cancels at file confirmation ─────────────────────────────────────────

describe('runInitFlow — user cancels at file confirmation', () => {
	it('returns false and does not write manifest', async () => {
		// User deselects all files in checklist — returns false with validation error
		vi.mocked(ctx.io.checklist).mockResolvedValueOnce([]);

		const result = await runInitFlow(ctx, CWD);

		expect(result).toBe(false);
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});
});

// ── JSON mode ─────────────────────────────────────────────────────────────────

describe('runInitFlow — JSON mode', () => {
	it('skips checklist and includes all detected files', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);

		await runInitFlow(ctx, CWD);

		expect(ctx.io.checklist).not.toHaveBeenCalled();
		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.files).toHaveLength(DETECTED_FILES.length);
	});
});

// ── existing setup.json ───────────────────────────────────────────────────────

describe('runInitFlow — existing setup.json', () => {
	it('returns false when user declines overwrite', async () => {
		vi.mocked(ctx.fs.existsSync).mockReturnValue(true);
		vi.mocked(ctx.io.confirm).mockResolvedValue(false);

		const result = await runInitFlow(ctx, CWD);

		expect(result).toBe(false);
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('proceeds with flow when user confirms overwrite', async () => {
		vi.mocked(ctx.fs.existsSync).mockReturnValue(true);
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);

		const result = await runInitFlow(ctx, CWD);

		expect(mockDetectFiles).toHaveBeenCalled();
		expect(mockWriteManifest).toHaveBeenCalled();
		expect(result).toBe(true);
	});
});

// ── zero files detected ───────────────────────────────────────────────────────

describe('runInitFlow — zero files detected', () => {
	beforeEach(() => {
		mockDetectFiles.mockReturnValue([]);
	});

	it('returns false when user declines scaffold', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(false);

		const result = await runInitFlow(ctx, CWD);

		expect(result).toBe(false);
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('writes manifest with empty files array when user confirms scaffold', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);

		const result = await runInitFlow(ctx, CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(CWD, expect.objectContaining({ files: [] }));
		expect(result).toBe(true);
	});

	it('shows warning about no files included', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);

		await runInitFlow(ctx, CWD);

		expect(ctx.io.warning).toHaveBeenCalledWith(expect.stringContaining('No files included'));
	});
});

// ── slug derivation ───────────────────────────────────────────────────────────

describe('runInitFlow — slug derivation', () => {
	it('converts name with spaces to kebab-case slug', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({ ...DEFAULT_METADATA, name: 'My Setup' });

		const result = await runInitFlow(ctx, CWD);

		expect(result).toBe(true);
		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ name: 'my-setup' })
		);
	});

	it('converts mixed case and special chars to valid slug', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			name: 'My Awesome  Setup!'
		});

		await runInitFlow(ctx, CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ name: 'my-awesome-setup' })
		);
	});
});

// ── invalid slug ──────────────────────────────────────────────────────────────

describe('runInitFlow — invalid slug', () => {
	it('throws when name produces an empty slug', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({ ...DEFAULT_METADATA, name: '!!!' });

		await expect(runInitFlow(ctx, CWD)).rejects.toThrow('Setup name is required');
	});
});

// ── agent auto-detection ──────────────────────────────────────────────────────

describe('computeDetectedAgents', () => {
	it('returns empty map for empty files', () => {
		const counts = computeDetectedAgents([]);
		expect(counts.size).toBe(0);
	});

	it('counts files per agent slug', () => {
		const counts = computeDetectedAgents(DETECTED_FILES);
		expect(counts.get('claude-code')).toBe(2);
		expect(counts.size).toBe(1);
	});

	it('handles multiple agents', () => {
		const counts = computeDetectedAgents(MULTI_AGENT_FILES);
		expect(counts.get('claude-code')).toBe(2);
		expect(counts.get('cursor')).toBe(1);
		expect(counts.size).toBe(2);
	});

	it('ignores files with empty tool string', () => {
		const counts = computeDetectedAgents(MULTI_AGENT_FILES);
		expect(counts.has('')).toBe(false);
	});
});

describe('runInitFlow — agents array auto-populated', () => {
	it('populates agents from detected files', async () => {
		await runInitFlow(ctx, CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({
				agents: expect.arrayContaining(['claude-code'])
			})
		);
	});

	it('passes auto-detected agents to promptMetadata as prefilledAgents', async () => {
		await runInitFlow(ctx, CWD);

		expect(ctx.io.promptMetadata).toHaveBeenCalledWith(
			['claude-code'],
			expect.any(Array),
			expect.any(Array)
		);
	});

	it('merges user-provided agents from metadata with auto-detected agents', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({ ...DEFAULT_METADATA, agents: ['cursor'] });

		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.agents).toContain('claude-code');
		expect(writtenManifest.agents).toContain('cursor');
	});

	it('deduplicates agents when user confirms the pre-filled value', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			agents: ['claude-code']
		});

		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const claudeCount = (writtenManifest.agents as string[]).filter(
			(a) => a === 'claude-code'
		).length;
		expect(claudeCount).toBe(1);
	});

	it('passes detected files to formatFileList for display', async () => {
		await runInitFlow(ctx, CWD);

		expect(mockFormatFileList).toHaveBeenCalledWith(DETECTED_FILES);
	});

	it('does not call formatFileList when no files detected', async () => {
		mockDetectFiles.mockReturnValue([]);
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);

		await runInitFlow(ctx, CWD);

		expect(mockFormatFileList).not.toHaveBeenCalled();
	});

	it('omits agents key from manifest when none detected and user provides none', async () => {
		mockDetectFiles.mockReturnValue([]);
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({ ...DEFAULT_METADATA, agents: [] });

		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.agents).toBeUndefined();
	});
});

// ── file tagging (agent field) ────────────────────────────────────────────────

describe('runInitFlow — file tagging', () => {
	it('sets agent field on each file entry matching an agent', async () => {
		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const claudeFile = (writtenManifest.files as Array<{ path: string; agent?: string }>).find(
			(f) => f.path === 'CLAUDE.md'
		);
		expect(claudeFile).toBeDefined();
		expect(claudeFile!.agent).toBe('claude-code');
	});

	it('sets agent field on all files including deeply-nested paths', async () => {
		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const settingsFile = (writtenManifest.files as Array<{ path: string; agent?: string }>).find(
			(f) => f.path === '.claude/settings.json'
		);
		expect(settingsFile).toBeDefined();
		expect(settingsFile!.agent).toBe('claude-code');
	});

	it('does not set agent field on shared files with empty tool', async () => {
		mockDetectFiles.mockReturnValue(MULTI_AGENT_FILES);
		vi.mocked(ctx.io.checklist).mockResolvedValueOnce(MULTI_AGENT_FILES.map((f) => f.path));
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({ ...DEFAULT_METADATA, agents: [] });

		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const sharedFile = (writtenManifest.files as Array<{ path: string; agent?: string }>).find(
			(f) => f.path === 'README.md'
		);
		expect(sharedFile).toBeDefined();
		expect(sharedFile!.agent).toBeUndefined();
	});

	it('tags each file correctly in a multi-agent project', async () => {
		mockDetectFiles.mockReturnValue(MULTI_AGENT_FILES);
		vi.mocked(ctx.io.checklist).mockResolvedValueOnce(MULTI_AGENT_FILES.map((f) => f.path));
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({ ...DEFAULT_METADATA, agents: [] });

		await runInitFlow(ctx, CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const cursorFile = (writtenManifest.files as Array<{ path: string; agent?: string }>).find(
			(f) => f.path === '.cursor/rules/main.mdc'
		);
		expect(cursorFile).toBeDefined();
		expect(cursorFile!.agent).toBe('cursor');
	});
});

// ── confirmation flow uses formatFileList ────────────────────────────────────

describe('runInitFlow — confirmation flow', () => {
	it('passes detected files to formatFileList', async () => {
		await runInitFlow(ctx, CWD);

		expect(mockFormatFileList).toHaveBeenCalledWith(DETECTED_FILES);
	});

	it('passes multi-agent files to formatFileList', async () => {
		mockDetectFiles.mockReturnValue(MULTI_AGENT_FILES);
		vi.mocked(ctx.io.checklist).mockResolvedValueOnce(MULTI_AGENT_FILES.map((f) => f.path));

		await runInitFlow(ctx, CWD);

		expect(mockFormatFileList).toHaveBeenCalledWith(MULTI_AGENT_FILES);
	});
});
