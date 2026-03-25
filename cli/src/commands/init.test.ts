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
	promptMetadata: () => mockPromptMetadata(),
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
const { runInitFlow } = await import('./init.js');

// ── helpers ───────────────────────────────────────────────────────────────────

const DETECTED_FILES = [
	{
		source: 'CLAUDE.md',
		target: 'CLAUDE.md',
		placement: 'project' as const,
		componentType: 'instruction' as const,
		tool: 'claude',
		description: 'Claude instruction file'
	},
	{
		source: '.claude/settings.json',
		target: '~/.claude/settings.json',
		placement: 'global' as const,
		componentType: 'instruction' as const,
		tool: 'claude',
		description: 'Claude settings'
	}
];

const DEFAULT_METADATA = {
	name: 'my-setup',
	description: 'A test setup',
	category: 'general',
	agents: ['claude'],
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
