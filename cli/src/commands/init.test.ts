import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockDetectFiles = vi.fn();

vi.mock('../detector.js', () => ({
	detectFiles: (dir: string) => mockDetectFiles(dir)
}));

const mockWriteManifest = vi.fn();

vi.mock('../manifest.js', () => ({
	writeManifest: (...args: unknown[]) => mockWriteManifest(...args),
	MANIFEST_FILENAME: 'setup.json'
}));

const mockConfirm = vi.fn();
const mockConfirmFileList = vi.fn();
const mockPromptMetadata = vi.fn();

vi.mock('../prompts.js', () => ({
	confirm: (msg: string, def: boolean) => mockConfirm(msg, def),
	confirmFileList: (labels: string[]) => mockConfirmFileList(labels),
	promptMetadata: (prefilledAgents?: string[]) => mockPromptMetadata(prefilledAgents),
	promptDestination: vi.fn(),
	confirmPostInstall: vi.fn(),
	pickFiles: vi.fn(),
	select: vi.fn(),
	input: vi.fn(),
	resolveConflict: vi.fn()
}));

const mockExistsSync = vi.fn();

vi.mock('fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('fs')>();
	return {
		...actual,
		default: {
			...actual,
			existsSync: (...args: unknown[]) => mockExistsSync(...args)
		}
	};
});

const mockPrint = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockWarning = vi.fn();

vi.mock('../output.js', () => ({
	print: (msg: string) => mockPrint(msg),
	success: (msg: string) => mockSuccess(msg),
	error: (msg: string) => mockError(msg),
	warning: (msg: string) => mockWarning(msg),
	info: vi.fn(),
	setOutputMode: vi.fn(),
	isJsonMode: vi.fn(() => false),
	json: vi.fn()
}));

// Import after mocks are registered
const { runInitFlow, computeDetectedAgents } = await import('./init.js');

// ── helpers ───────────────────────────────────────────────────────────────────

const DETECTED_FILES = [
	{
		source: 'CLAUDE.md',
		target: 'CLAUDE.md',
		placement: 'project' as const,
		componentType: 'instruction' as const,
		tool: 'claude-code',
		description: 'Claude instruction file'
	},
	{
		source: '.claude/settings.json',
		target: '~/.claude/settings.json',
		placement: 'global' as const,
		componentType: 'config' as const,
		tool: 'claude-code',
		description: 'Claude settings'
	}
];

const MULTI_AGENT_FILES = [
	{
		source: 'CLAUDE.md',
		target: 'CLAUDE.md',
		placement: 'project' as const,
		componentType: 'instruction' as const,
		tool: 'claude-code',
		description: 'Claude instruction file'
	},
	{
		source: '.claude/settings.json',
		target: '~/.claude/settings.json',
		placement: 'global' as const,
		componentType: 'config' as const,
		tool: 'claude-code',
		description: 'Claude settings'
	},
	{
		source: '.cursor/rules/main.mdc',
		target: '.cursor/rules/main.mdc',
		placement: 'project' as const,
		componentType: 'instruction' as const,
		tool: 'cursor',
		description: 'Cursor rule'
	},
	{
		source: 'README.md',
		target: 'README.md',
		placement: 'project' as const,
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

beforeEach(() => {
	vi.clearAllMocks();
	mockExistsSync.mockReturnValue(false);
	mockDetectFiles.mockReturnValue(DETECTED_FILES);
	mockConfirmFileList.mockResolvedValue(true);
	mockPromptMetadata.mockResolvedValue(DEFAULT_METADATA);
	mockWriteManifest.mockReturnValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── normal flow ───────────────────────────────────────────────────────────────

describe('runInitFlow — normal flow', () => {
	it('detects files, confirms, prompts metadata, writes manifest, returns true', async () => {
		const result = await runInitFlow(CWD);

		expect(mockDetectFiles).toHaveBeenCalledWith(CWD);
		expect(mockConfirmFileList).toHaveBeenCalled();
		expect(mockPromptMetadata).toHaveBeenCalled();
		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({
				name: 'my-setup',
				description: 'A test setup',
				files: expect.arrayContaining([expect.objectContaining({ source: 'CLAUDE.md' })])
			})
		);
		expect(result).toBe(true);
	});

	it('calls success after writing manifest', async () => {
		await runInitFlow(CWD);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('setup.json'));
	});
});

// ── user cancels at file confirmation ─────────────────────────────────────────

describe('runInitFlow — user cancels at file confirmation', () => {
	it('returns false and does not write manifest', async () => {
		mockConfirmFileList.mockResolvedValue(false);

		const result = await runInitFlow(CWD);

		expect(result).toBe(false);
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});
});

// ── existing setup.json ───────────────────────────────────────────────────────

describe('runInitFlow — existing setup.json', () => {
	it('returns false when user declines overwrite', async () => {
		mockExistsSync.mockReturnValue(true);
		mockConfirm.mockResolvedValue(false);

		const result = await runInitFlow(CWD);

		expect(result).toBe(false);
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('proceeds with flow when user confirms overwrite', async () => {
		mockExistsSync.mockReturnValue(true);
		mockConfirm.mockResolvedValue(true);

		const result = await runInitFlow(CWD);

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
		mockConfirm.mockResolvedValue(false);

		const result = await runInitFlow(CWD);

		expect(result).toBe(false);
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('writes manifest with empty files array when user confirms scaffold', async () => {
		mockConfirm.mockResolvedValue(true);

		const result = await runInitFlow(CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(CWD, expect.objectContaining({ files: [] }));
		expect(result).toBe(true);
	});

	it('shows warning about no files included', async () => {
		mockConfirm.mockResolvedValue(true);

		await runInitFlow(CWD);

		expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('No files included'));
	});
});

// ── slug derivation ───────────────────────────────────────────────────────────

describe('runInitFlow — slug derivation', () => {
	it('converts name with spaces to kebab-case slug', async () => {
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, name: 'My Setup' });

		const result = await runInitFlow(CWD);

		expect(result).toBe(true);
		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ name: 'my-setup' })
		);
	});

	it('converts mixed case and special chars to valid slug', async () => {
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, name: 'My Awesome  Setup!' });

		await runInitFlow(CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ name: 'my-awesome-setup' })
		);
	});
});

// ── invalid slug ──────────────────────────────────────────────────────────────

describe('runInitFlow — invalid slug', () => {
	it('throws when name produces an empty slug', async () => {
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, name: '!!!' });

		await expect(runInitFlow(CWD)).rejects.toThrow('Setup name is required');
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
		await runInitFlow(CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({
				agents: expect.arrayContaining(['claude-code'])
			})
		);
	});

	it('passes auto-detected agents to promptMetadata as prefilledAgents', async () => {
		await runInitFlow(CWD);

		expect(mockPromptMetadata).toHaveBeenCalledWith(['claude-code']);
	});

	it('merges user-provided agents from metadata with auto-detected agents', async () => {
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, agents: ['cursor'] });

		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.agents).toContain('claude-code');
		expect(writtenManifest.agents).toContain('cursor');
	});

	it('deduplicates agents when user confirms the pre-filled value', async () => {
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, agents: ['claude-code'] });

		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const claudeCount = (writtenManifest.agents as string[]).filter(
			(a) => a === 'claude-code'
		).length;
		expect(claudeCount).toBe(1);
	});

	it('reports detected agents to the user', async () => {
		await runInitFlow(CWD);

		const printCalls = mockPrint.mock.calls.map((c) => c[0] as string);
		const agentReport = printCalls.find((msg) => msg.includes('Found config files for:'));
		expect(agentReport).toBeDefined();
		// AGENTS_BY_SLUG['claude-code'].displayName is 'Claude Code'
		expect(agentReport).toMatch(/Claude Code/i);
	});

	it('does not show agent report when no files detected', async () => {
		mockDetectFiles.mockReturnValue([]);
		mockConfirm.mockResolvedValue(true);

		await runInitFlow(CWD);

		const printCalls = mockPrint.mock.calls.map((c) => c[0] as string);
		const agentReport = printCalls.find((msg) => msg.includes('Found config files for:'));
		expect(agentReport).toBeUndefined();
	});

	it('omits agents key from manifest when none detected and user provides none', async () => {
		mockDetectFiles.mockReturnValue([]);
		mockConfirm.mockResolvedValue(true);
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, agents: [] });

		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest.agents).toBeUndefined();
	});
});

// ── file tagging (agent field) ────────────────────────────────────────────────

describe('runInitFlow — file tagging', () => {
	it('sets agent field on each file entry matching an agent', async () => {
		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const claudeFile = (writtenManifest.files as Array<{ source: string; agent?: string }>).find(
			(f) => f.source === 'CLAUDE.md'
		);
		expect(claudeFile).toBeDefined();
		expect(claudeFile!.agent).toBe('claude-code');
	});

	it('sets agent field on global placement files too', async () => {
		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const settingsFile = (writtenManifest.files as Array<{ source: string; agent?: string }>).find(
			(f) => f.source === '.claude/settings.json'
		);
		expect(settingsFile).toBeDefined();
		expect(settingsFile!.agent).toBe('claude-code');
	});

	it('does not set agent field on shared files with empty tool', async () => {
		mockDetectFiles.mockReturnValue(MULTI_AGENT_FILES);
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, agents: [] });

		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const sharedFile = (writtenManifest.files as Array<{ source: string; agent?: string }>).find(
			(f) => f.source === 'README.md'
		);
		expect(sharedFile).toBeDefined();
		expect(sharedFile!.agent).toBeUndefined();
	});

	it('tags each file correctly in a multi-agent project', async () => {
		mockDetectFiles.mockReturnValue(MULTI_AGENT_FILES);
		mockPromptMetadata.mockResolvedValue({ ...DEFAULT_METADATA, agents: [] });

		await runInitFlow(CWD);

		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		const cursorFile = (writtenManifest.files as Array<{ source: string; agent?: string }>).find(
			(f) => f.source === '.cursor/rules/main.mdc'
		);
		expect(cursorFile).toBeDefined();
		expect(cursorFile!.agent).toBe('cursor');
	});
});

// ── confirmation flow shows agent info ───────────────────────────────────────

describe('runInitFlow — confirmation flow', () => {
	it('includes agent tag in file labels shown to user', async () => {
		await runInitFlow(CWD);

		const fileLabels = mockConfirmFileList.mock.calls[0]![0] as string[];
		const hasAgentTag = fileLabels.some((label) => label.includes('[agent: claude-code]'));
		expect(hasAgentTag).toBe(true);
	});

	it('does not include agent tag for shared files with no tool', async () => {
		mockDetectFiles.mockReturnValue(MULTI_AGENT_FILES);

		await runInitFlow(CWD);

		const fileLabels = mockConfirmFileList.mock.calls[0]![0] as string[];
		const readmeLabel = fileLabels.find((l) => l.includes('README.md'));
		expect(readmeLabel).toBeDefined();
		expect(readmeLabel).not.toContain('[agent:');
	});
});
