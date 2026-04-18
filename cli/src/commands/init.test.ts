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

const mockRunLoginFlow = vi.fn();

vi.mock('./login.js', () => ({
	runLoginFlow: (...args: unknown[]) => mockRunLoginFlow(...args),
	registerLogin: vi.fn()
}));

// Import after mocks are registered
const { runInitFlow, computeDetectedAgents, toSlug } = await import('./init.js');

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
	tags: ['test'],
	visibility: 'public' as const
};

const MOCK_TEAMS = [
	{ id: 'team-uuid-1', name: 'Acme Corp', slug: 'acme' },
	{ id: 'team-uuid-2', name: 'Beta Inc', slug: 'beta-inc' }
];

const CWD = '/fake/cwd';

let ctx: CommandContext;

beforeEach(() => {
	ctx = createTestContext();
	vi.clearAllMocks();

	vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(true);
	vi.mocked(ctx.fs.existsSync).mockReturnValue(false);
	mockDetectFiles.mockReturnValue(DETECTED_FILES);
	vi.mocked(ctx.io.confirm).mockResolvedValue(true);
	// Default: checklist returns all detected file paths (all pre-selected, none deselected)
	vi.mocked(ctx.io.checklist).mockResolvedValue(DETECTED_FILES.map((f) => f.path));
	mockFormatFileList.mockReturnValue('(formatted file list)');
	vi.mocked(ctx.io.promptMetadata).mockResolvedValue(DEFAULT_METADATA);
	mockWriteManifest.mockReturnValue(undefined);
	// Default: no teams
	vi.mocked(ctx.api.get).mockResolvedValue({ teams: [], hasBetaFeatures: false });
	mockRunLoginFlow.mockResolvedValue('alice');
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── authentication required ───────────────────────────────────────────────────

describe('runInitFlow — authentication required', () => {
	beforeEach(() => {
		vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(false);
	});

	it('errors and exits in JSON mode when not logged in', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});

		await expect(runInitFlow(ctx, CWD)).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('coati login'));
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('offers login flow when not logged in in text mode', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(false);
		vi.mocked(ctx.io.confirm).mockResolvedValue(true);
		mockRunLoginFlow.mockResolvedValue('alice');
		// After login, treat as logged in
		vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(false);

		await runInitFlow(ctx, CWD);

		expect(ctx.io.warning).toHaveBeenCalledWith(expect.stringContaining('not logged in'));
		expect(ctx.io.confirm).toHaveBeenCalledWith(expect.stringContaining('log in'), true);
		expect(mockRunLoginFlow).toHaveBeenCalledWith(ctx);
	});

	it('returns false and does not write manifest when user declines login', async () => {
		vi.mocked(ctx.io.confirm).mockResolvedValue(false);

		const result = await runInitFlow(ctx, CWD);

		expect(result).toBe(false);
		expect(mockRunLoginFlow).not.toHaveBeenCalled();
		expect(mockWriteManifest).not.toHaveBeenCalled();
	});

	it('proceeds after successful login', async () => {
		vi.mocked(ctx.io.confirm)
			.mockResolvedValueOnce(true) // accept login
			.mockResolvedValue(true); // any other confirms
		mockRunLoginFlow.mockResolvedValue('alice');

		const result = await runInitFlow(ctx, CWD);

		expect(mockRunLoginFlow).toHaveBeenCalled();
		expect(result).toBe(true);
		expect(mockWriteManifest).toHaveBeenCalled();
	});
});

// ── org prompt (teams) ────────────────────────────────────────────────────────

describe('runInitFlow — org prompt when user has teams', () => {
	beforeEach(() => {
		vi.mocked(ctx.api.get).mockResolvedValue({ teams: MOCK_TEAMS, hasBetaFeatures: true });
	});

	it('shows org prompt with My profile and team options', async () => {
		vi.mocked(ctx.io.select).mockResolvedValue('__personal__');

		await runInitFlow(ctx, CWD);

		expect(ctx.io.select).toHaveBeenCalledWith(
			expect.stringContaining('Where does this setup live'),
			expect.arrayContaining([
				expect.objectContaining({ value: '__personal__', label: 'My profile' }),
				expect.objectContaining({ value: 'acme', label: 'Acme Corp' }),
				expect.objectContaining({ value: 'beta-inc', label: 'Beta Inc' })
			])
		);
	});

	it('writes org + private visibility when team is picked', async () => {
		vi.mocked(ctx.io.select).mockResolvedValue('acme');

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.org).toBe('acme');
		expect(written.visibility).toBe('private');
	});

	it('passes skipVisibilityPrompt=true to promptMetadata when team picked', async () => {
		vi.mocked(ctx.io.select).mockResolvedValue('acme');

		await runInitFlow(ctx, CWD);

		expect(ctx.io.promptMetadata).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Array),
			expect.any(Array),
			expect.objectContaining({ skipVisibilityPrompt: true })
		);
	});

	it('falls through to visibility prompt when My profile is picked', async () => {
		vi.mocked(ctx.io.select).mockResolvedValue('__personal__');
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			visibility: 'public'
		});

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.org).toBeUndefined();
		expect(written.visibility).toBe('public');
	});

	it('passes skipVisibilityPrompt=false to promptMetadata when My profile picked', async () => {
		vi.mocked(ctx.io.select).mockResolvedValue('__personal__');

		await runInitFlow(ctx, CWD);

		expect(ctx.io.promptMetadata).toHaveBeenCalledWith(
			expect.any(Array),
			expect.any(Array),
			expect.any(Array),
			expect.objectContaining({ skipVisibilityPrompt: false })
		);
	});
});

describe('runInitFlow — org prompt skipped with zero teams', () => {
	beforeEach(() => {
		vi.mocked(ctx.api.get).mockResolvedValue({ teams: [], hasBetaFeatures: false });
	});

	it('does not show org prompt when user has no teams', async () => {
		await runInitFlow(ctx, CWD);

		expect(ctx.io.select).not.toHaveBeenCalled();
	});

	it('writes visibility from metadata (no org) when user has no teams', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			visibility: 'public'
		});

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.org).toBeUndefined();
		expect(written.visibility).toBe('public');
	});
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

	it('does not prompt for placement', async () => {
		await runInitFlow(ctx, CWD);
		expect(ctx.io.select).not.toHaveBeenCalled();
	});

	it('does not include placement in written manifest', async () => {
		await runInitFlow(ctx, CWD);
		const writtenManifest = mockWriteManifest.mock.calls[0]![1];
		expect(writtenManifest).not.toHaveProperty('placement');
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
			expect.any(Array),
			expect.any(Object)
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

// ── toSlug unit tests ─────────────────────────────────────────────────────────

describe('toSlug', () => {
	it('lowercases a plain name', () => {
		expect(toSlug('MySetup')).toBe('mysetup');
	});

	it('replaces spaces with hyphens', () => {
		expect(toSlug('my setup')).toBe('my-setup');
	});

	it('collapses multiple spaces into a single hyphen', () => {
		expect(toSlug('my  awesome   setup')).toBe('my-awesome-setup');
	});

	it('removes apostrophes', () => {
		expect(toSlug("Jim's Setup")).toBe('jims-setup');
	});

	it('removes special characters', () => {
		expect(toSlug('My Awesome Setup!')).toBe('my-awesome-setup');
	});

	it('handles mixed punctuation and spaces', () => {
		expect(toSlug('C++ / Python Setup')).toBe('c-python-setup');
	});

	it('strips leading and trailing hyphens', () => {
		expect(toSlug('---my setup---')).toBe('my-setup');
	});

	it('returns empty string for all-special-char input', () => {
		expect(toSlug('!!!')).toBe('');
	});

	it('handles unicode letters by stripping them', () => {
		expect(toSlug('café setup')).toBe('caf-setup');
	});

	it('preserves digits', () => {
		expect(toSlug('Setup 42')).toBe('setup-42');
	});

	it('handles already-valid slug unchanged', () => {
		expect(toSlug('my-setup')).toBe('my-setup');
	});

	it('handles leading/trailing whitespace', () => {
		expect(toSlug('  my setup  ')).toBe('my-setup');
	});
});

// ── display field written by init ─────────────────────────────────────────────

describe('runInitFlow — display field', () => {
	it('writes raw user input as display field', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			name: 'My Setup'
		});

		await runInitFlow(ctx, CWD);

		expect(mockWriteManifest).toHaveBeenCalledWith(
			CWD,
			expect.objectContaining({ display: 'My Setup' })
		);
	});

	it('writes slugified name as the name field when display differs', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			name: 'My Awesome Setup!'
		});

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.display).toBe('My Awesome Setup!');
		expect(written.name).toBe('my-awesome-setup');
	});

	it('trims whitespace from display before writing', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			name: '  My Setup  '
		});

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.display).toBe('My Setup');
		expect(written.name).toBe('my-setup');
	});

	it('omits display field when name is already a valid slug', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			name: 'my-setup'
		});

		await runInitFlow(ctx, CWD);

		// display is still written (it's the raw input, trimmed)
		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.display).toBe('my-setup');
		expect(written.name).toBe('my-setup');
	});
});

// ── visibility field written by init ──────────────────────────────────────────

describe('runInitFlow — visibility field', () => {
	it('writes public visibility when user picks public (default)', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			visibility: 'public'
		});

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.visibility).toBe('public');
	});

	it('writes private visibility when user picks private', async () => {
		vi.mocked(ctx.io.promptMetadata).mockResolvedValue({
			...DEFAULT_METADATA,
			visibility: 'private'
		});

		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.visibility).toBe('private');
	});

	it('defaults to public visibility', async () => {
		// DEFAULT_METADATA has visibility: 'public' — assert the default is written
		await runInitFlow(ctx, CWD);

		const written = mockWriteManifest.mock.calls[0]![1];
		expect(written.visibility).toBe('public');
	});
});
