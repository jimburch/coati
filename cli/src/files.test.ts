import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTargetPath, writeSetupFiles, type FileToWrite } from './files.js';

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const { mockResolveConflict } = vi.hoisted(() => ({
	mockResolveConflict:
		vi.fn<(filePath: string, incomingContent: string) => Promise<'overwrite' | 'skip' | 'backup'>>()
}));

vi.mock('./prompts.js', () => ({
	resolveConflict: mockResolveConflict,
	confirm: vi.fn(),
	select: vi.fn(),
	input: vi.fn(),
	promptDestination: vi.fn(),
	promptMetadata: vi.fn(),
	confirmFileList: vi.fn(),
	confirmPostInstall: vi.fn()
}));

// ── helpers ───────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-files-test-'));
	vi.clearAllMocks();
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeFile(overrides: Partial<FileToWrite> = {}): FileToWrite {
	return {
		source: 'CLAUDE.md',
		target: 'CLAUDE.md',
		placement: 'project',
		content: '# Hello',
		...overrides
	};
}

// ── resolveTargetPath ─────────────────────────────────────────────────────────

describe('resolveTargetPath', () => {
	it('expands ~/ for global placement', () => {
		const result = resolveTargetPath('~/.claude/settings.json', 'global');
		expect(result).toBe(path.join(os.homedir(), '.claude/settings.json'));
	});

	it('passes through absolute path for global placement', () => {
		const abs = '/etc/some/config';
		expect(resolveTargetPath(abs, 'global')).toBe(abs);
	});

	it('joins bare name to home dir for global placement (no leading ~/)', () => {
		const result = resolveTargetPath('bare-name', 'global');
		expect(result).toBe(path.join(os.homedir(), 'bare-name'));
	});

	it('resolves project placement relative to projectDir', () => {
		const result = resolveTargetPath('CLAUDE.md', 'project', { projectDir: tmpDir });
		expect(result).toBe(path.join(tmpDir, 'CLAUDE.md'));
	});

	it('falls back to cwd for project placement when no projectDir given', () => {
		const result = resolveTargetPath('file.txt', 'project');
		expect(result).toBe(path.resolve(process.cwd(), 'file.txt'));
	});
});

// ── writeSetupFiles: basic write ──────────────────────────────────────────────

describe('writeSetupFiles — basic write', () => {
	it('writes a file and returns written=1', async () => {
		const result = await writeSetupFiles([makeFile({ target: 'out.md', content: 'hello' })], {
			projectDir: tmpDir
		});

		expect(result.written).toBe(1);
		expect(result.skipped).toBe(0);
		expect(result.backedUp).toBe(0);
		expect(result.files[0]!.outcome).toBe('written');
		expect(fs.readFileSync(path.join(tmpDir, 'out.md'), 'utf-8')).toBe('hello');
	});

	it('creates parent directories as needed', async () => {
		await writeSetupFiles([makeFile({ target: 'a/b/c/file.txt', content: 'deep' })], {
			projectDir: tmpDir
		});

		const fullPath = path.join(tmpDir, 'a', 'b', 'c', 'file.txt');
		expect(fs.existsSync(fullPath)).toBe(true);
		expect(fs.readFileSync(fullPath, 'utf-8')).toBe('deep');
	});

	it('writes atomically (no orphaned temp file on success)', async () => {
		await writeSetupFiles([makeFile({ target: 'atomic.txt', content: 'data' })], {
			projectDir: tmpDir
		});

		expect(fs.existsSync(path.join(tmpDir, 'atomic.txt.coati-tmp'))).toBe(false);
		expect(fs.existsSync(path.join(tmpDir, 'atomic.txt'))).toBe(true);
	});

	it('returns resolved absolute target path in results', async () => {
		const result = await writeSetupFiles([makeFile({ target: 'sub/file.md', content: '' })], {
			projectDir: tmpDir
		});
		expect(result.files[0]!.target).toBe(path.join(tmpDir, 'sub', 'file.md'));
	});
});

// ── writeSetupFiles: dry-run ──────────────────────────────────────────────────

describe('writeSetupFiles — dry run', () => {
	it('does not write any files in dry-run mode', async () => {
		const result = await writeSetupFiles([makeFile({ target: 'dry.md', content: 'x' })], {
			projectDir: tmpDir,
			dryRun: true
		});

		expect(result.written).toBe(1);
		expect(fs.existsSync(path.join(tmpDir, 'dry.md'))).toBe(false);
	});

	it('reports outcome "written" for dry-run entries', async () => {
		const result = await writeSetupFiles([makeFile({ target: 'dry.md', content: 'x' })], {
			projectDir: tmpDir,
			dryRun: true
		});
		expect(result.files[0]!.outcome).toBe('written');
	});
});

// ── writeSetupFiles: conflict handling ───────────────────────────────────────

describe('writeSetupFiles — conflict: overwrite', () => {
	it('overwrites existing file when user picks overwrite', async () => {
		const filePath = path.join(tmpDir, 'conf.md');
		fs.writeFileSync(filePath, 'old content');
		mockResolveConflict.mockResolvedValue('overwrite');

		const result = await writeSetupFiles(
			[makeFile({ target: 'conf.md', content: 'new content' })],
			{
				projectDir: tmpDir
			}
		);

		expect(result.written).toBe(1);
		expect(result.files[0]!.outcome).toBe('written');
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
	});
});

describe('writeSetupFiles — conflict: skip', () => {
	it('skips existing file when user picks skip', async () => {
		const filePath = path.join(tmpDir, 'skip.md');
		fs.writeFileSync(filePath, 'original');
		mockResolveConflict.mockResolvedValue('skip');

		const result = await writeSetupFiles([makeFile({ target: 'skip.md', content: 'new' })], {
			projectDir: tmpDir
		});

		expect(result.skipped).toBe(1);
		expect(result.files[0]!.outcome).toBe('skipped');
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');
	});
});

describe('writeSetupFiles — conflict: backup', () => {
	it('copies existing file to .coati-backup then writes new file', async () => {
		const filePath = path.join(tmpDir, 'back.md');
		fs.writeFileSync(filePath, 'old');
		mockResolveConflict.mockResolvedValue('backup');

		const result = await writeSetupFiles([makeFile({ target: 'back.md', content: 'new' })], {
			projectDir: tmpDir
		});

		expect(result.backedUp).toBe(1);
		expect(result.files[0]!.outcome).toBe('backed-up');
		expect(result.files[0]!.backupPath).toBe(filePath + '.coati-backup');
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('new');
		expect(fs.readFileSync(filePath + '.coati-backup', 'utf-8')).toBe('old');
	});
});

// ── writeSetupFiles: --force flag ─────────────────────────────────────────────

describe('writeSetupFiles — force', () => {
	it('overwrites existing files without prompting when force=true', async () => {
		const filePath = path.join(tmpDir, 'force.md');
		fs.writeFileSync(filePath, 'original');

		const result = await writeSetupFiles([makeFile({ target: 'force.md', content: 'forced' })], {
			projectDir: tmpDir,
			force: true
		});

		expect(mockResolveConflict).not.toHaveBeenCalled();
		expect(result.written).toBe(1);
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('forced');
	});
});

// ── writeSetupFiles: JSON mode auto-skip ──────────────────────────────────────

describe('writeSetupFiles — JSON mode', () => {
	it('auto-skips conflicts in JSON mode without prompting', async () => {
		const filePath = path.join(tmpDir, 'json.md');
		fs.writeFileSync(filePath, 'original');

		const result = await writeSetupFiles([makeFile({ target: 'json.md', content: 'new' })], {
			projectDir: tmpDir,
			isJson: true
		});

		expect(mockResolveConflict).not.toHaveBeenCalled();
		expect(result.skipped).toBe(1);
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');
	});
});

// ── writeSetupFiles: multiple files ───────────────────────────────────────────

describe('writeSetupFiles — multiple files', () => {
	it('handles multiple files with mixed outcomes', async () => {
		fs.writeFileSync(path.join(tmpDir, 'existing.md'), 'old');
		mockResolveConflict.mockResolvedValue('skip');

		const files: FileToWrite[] = [
			makeFile({ target: 'new.md', content: 'new file' }),
			makeFile({ target: 'existing.md', content: 'updated' })
		];

		const result = await writeSetupFiles(files, { projectDir: tmpDir });

		expect(result.written).toBe(1);
		expect(result.skipped).toBe(1);
		expect(result.files).toHaveLength(2);
	});
});

// ── writeSetupFiles: global placement path expansion ─────────────────────────

describe('writeSetupFiles — global placement', () => {
	it('resolves global placement target to home-relative path', async () => {
		const result = await writeSetupFiles(
			[makeFile({ target: '~/.claude/settings.json', placement: 'global', content: 'cfg' })],
			{}
		);

		const expectedPath = path.join(os.homedir(), '.claude', 'settings.json');
		expect(result.files[0]!.target).toBe(expectedPath);

		// Clean up the written file
		try {
			fs.unlinkSync(expectedPath);
		} catch {
			// ignore
		}
	});
});
