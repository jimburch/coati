import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTargetPath, writeSetupFiles, type FileToWrite } from './files.js';

// ── hoisted mocks ─────────────────────────────────────────────────────────────

const { mockResolveConflicts } = vi.hoisted(() => ({
	mockResolveConflicts:
		vi.fn<
			(
				files: { relativePath: string; absolutePath: string; incomingContent: string }[]
			) => Promise<Map<string, 'overwrite' | 'skip' | 'backup'>>
		>()
}));

vi.mock('./prompts.js', () => ({
	resolveConflicts: mockResolveConflicts,
	resolveConflict: vi.fn(),
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
		path: 'CLAUDE.md',
		content: '# Hello',
		...overrides
	};
}

// ── resolveTargetPath ─────────────────────────────────────────────────────────

describe('resolveTargetPath', () => {
	it('resolves global placement to home directory', () => {
		const result = resolveTargetPath('.claude/settings.json', 'global');
		expect(result).toBe(path.join(os.homedir(), '.claude/settings.json'));
	});

	it('resolves bare name under home dir for global placement', () => {
		const result = resolveTargetPath('bare-name', 'global');
		expect(result).toBe(path.join(os.homedir(), 'bare-name'));
	});

	it('resolves deeply nested path under home dir for global placement', () => {
		const result = resolveTargetPath('.claude/commands/review.md', 'global');
		expect(result).toBe(path.join(os.homedir(), '.claude/commands/review.md'));
	});

	it('resolves project placement relative to projectDir', () => {
		const result = resolveTargetPath('CLAUDE.md', 'project', { projectDir: tmpDir });
		expect(result).toBe(path.join(tmpDir, 'CLAUDE.md'));
	});

	it('falls back to cwd for project placement when no projectDir given', () => {
		const result = resolveTargetPath('file.txt', 'project');
		expect(result).toBe(path.resolve(process.cwd(), 'file.txt'));
	});

	it('resolves nested project path relative to projectDir', () => {
		const result = resolveTargetPath('.cursor/rules/main.mdc', 'project', {
			projectDir: tmpDir
		});
		expect(result).toBe(path.join(tmpDir, '.cursor/rules/main.mdc'));
	});
});

// ── writeSetupFiles: basic write ──────────────────────────────────────────────

describe('writeSetupFiles — basic write', () => {
	it('writes a file and returns written=1', async () => {
		const result = await writeSetupFiles([makeFile({ path: 'out.md', content: 'hello' })], {
			projectDir: tmpDir,
			placement: 'project'
		});

		expect(result.written).toBe(1);
		expect(result.skipped).toBe(0);
		expect(result.backedUp).toBe(0);
		expect(result.files[0]!.outcome).toBe('written');
		expect(fs.readFileSync(path.join(tmpDir, 'out.md'), 'utf-8')).toBe('hello');
	});

	it('creates parent directories as needed', async () => {
		await writeSetupFiles([makeFile({ path: 'a/b/c/file.txt', content: 'deep' })], {
			projectDir: tmpDir,
			placement: 'project'
		});

		const fullPath = path.join(tmpDir, 'a', 'b', 'c', 'file.txt');
		expect(fs.existsSync(fullPath)).toBe(true);
		expect(fs.readFileSync(fullPath, 'utf-8')).toBe('deep');
	});

	it('writes atomically (no orphaned temp file on success)', async () => {
		await writeSetupFiles([makeFile({ path: 'atomic.txt', content: 'data' })], {
			projectDir: tmpDir,
			placement: 'project'
		});

		expect(fs.existsSync(path.join(tmpDir, 'atomic.txt.coati-tmp'))).toBe(false);
		expect(fs.existsSync(path.join(tmpDir, 'atomic.txt'))).toBe(true);
	});

	it('returns resolved absolute target path in results', async () => {
		const result = await writeSetupFiles([makeFile({ path: 'sub/file.md', content: '' })], {
			projectDir: tmpDir,
			placement: 'project'
		});
		expect(result.files[0]!.target).toBe(path.join(tmpDir, 'sub', 'file.md'));
	});
});

// ── writeSetupFiles: dry-run ──────────────────────────────────────────────────

describe('writeSetupFiles — dry run', () => {
	it('does not write any files in dry-run mode', async () => {
		const result = await writeSetupFiles([makeFile({ path: 'dry.md', content: 'x' })], {
			projectDir: tmpDir,
			placement: 'project',
			dryRun: true
		});

		expect(result.written).toBe(1);
		expect(fs.existsSync(path.join(tmpDir, 'dry.md'))).toBe(false);
	});

	it('reports outcome "written" for dry-run entries', async () => {
		const result = await writeSetupFiles([makeFile({ path: 'dry.md', content: 'x' })], {
			projectDir: tmpDir,
			placement: 'project',
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
		mockResolveConflicts.mockResolvedValue(new Map([[filePath, 'overwrite']]));

		const result = await writeSetupFiles([makeFile({ path: 'conf.md', content: 'new content' })], {
			projectDir: tmpDir,
			placement: 'project'
		});

		expect(result.written).toBe(1);
		expect(result.files[0]!.outcome).toBe('written');
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('new content');
	});
});

describe('writeSetupFiles — conflict: skip', () => {
	it('skips existing file when user picks skip', async () => {
		const filePath = path.join(tmpDir, 'skip.md');
		fs.writeFileSync(filePath, 'original');
		mockResolveConflicts.mockResolvedValue(new Map([[filePath, 'skip']]));

		const result = await writeSetupFiles([makeFile({ path: 'skip.md', content: 'new' })], {
			projectDir: tmpDir,
			placement: 'project'
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
		mockResolveConflicts.mockResolvedValue(new Map([[filePath, 'backup']]));

		const result = await writeSetupFiles([makeFile({ path: 'back.md', content: 'new' })], {
			projectDir: tmpDir,
			placement: 'project'
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

		const result = await writeSetupFiles([makeFile({ path: 'force.md', content: 'forced' })], {
			projectDir: tmpDir,
			placement: 'project',
			force: true
		});

		expect(mockResolveConflicts).not.toHaveBeenCalled();
		expect(result.written).toBe(1);
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('forced');
	});
});

// ── writeSetupFiles: JSON mode auto-skip ──────────────────────────────────────

describe('writeSetupFiles — JSON mode', () => {
	it('auto-skips conflicts in JSON mode without prompting', async () => {
		const filePath = path.join(tmpDir, 'json.md');
		fs.writeFileSync(filePath, 'original');

		const result = await writeSetupFiles([makeFile({ path: 'json.md', content: 'new' })], {
			projectDir: tmpDir,
			placement: 'project',
			isJson: true
		});

		expect(mockResolveConflicts).not.toHaveBeenCalled();
		expect(result.skipped).toBe(1);
		expect(fs.readFileSync(filePath, 'utf-8')).toBe('original');
	});
});

// ── writeSetupFiles: multiple files ───────────────────────────────────────────

describe('writeSetupFiles — multiple files', () => {
	it('handles multiple files with mixed outcomes', async () => {
		const existingPath = path.join(tmpDir, 'existing.md');
		fs.writeFileSync(existingPath, 'old');
		mockResolveConflicts.mockResolvedValue(new Map([[existingPath, 'skip']]));

		const files: FileToWrite[] = [
			makeFile({ path: 'new.md', content: 'new file' }),
			makeFile({ path: 'existing.md', content: 'updated' })
		];

		const result = await writeSetupFiles(files, { projectDir: tmpDir, placement: 'project' });

		expect(result.written).toBe(1);
		expect(result.skipped).toBe(1);
		expect(result.files).toHaveLength(2);
	});
});

// ── writeSetupFiles: global placement path expansion ─────────────────────────

describe('writeSetupFiles — global placement', () => {
	it('resolves global placement path to home-relative path', async () => {
		const result = await writeSetupFiles(
			[makeFile({ path: '.claude/settings.json', content: 'cfg' })],
			{ placement: 'global' }
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
