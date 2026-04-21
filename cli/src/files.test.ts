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
	promptVisibility: vi.fn(),
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

// ── writeSetupFiles: identity skip ────────────────────────────────────────────

describe('writeSetupFiles — identical targets', () => {
	it('reports identical files as unchanged, never prompts, never writes', async () => {
		const filePath = path.join(tmpDir, 'same.md');
		fs.writeFileSync(filePath, '# Hello', 'utf-8');
		const mtimeBefore = fs.statSync(filePath).mtimeMs;

		// Give the filesystem a tick so any rewrite would produce a distinct mtime.
		await new Promise((r) => setTimeout(r, 10));

		const result = await writeSetupFiles([makeFile({ path: 'same.md', content: '# Hello' })], {
			projectDir: tmpDir,
			placement: 'project'
		});

		expect(mockResolveConflicts).not.toHaveBeenCalled();
		expect(result.unchanged).toBe(1);
		expect(result.written).toBe(0);
		expect(result.files[0]!.outcome).toBe('unchanged');
		expect(fs.statSync(filePath).mtimeMs).toBe(mtimeBefore);
	});

	it('does not include identical files in the conflict set passed to resolveConflicts', async () => {
		const same = path.join(tmpDir, 'same.md');
		const diff = path.join(tmpDir, 'diff.md');
		fs.writeFileSync(same, '# Hello', 'utf-8');
		fs.writeFileSync(diff, '# Old', 'utf-8');
		mockResolveConflicts.mockResolvedValue(new Map([[diff, 'overwrite']]));

		await writeSetupFiles(
			[
				makeFile({ path: 'same.md', content: '# Hello' }),
				makeFile({ path: 'diff.md', content: '# New' })
			],
			{ projectDir: tmpDir, placement: 'project' }
		);

		expect(mockResolveConflicts).toHaveBeenCalledTimes(1);
		const [conflicts] = mockResolveConflicts.mock.calls[0]!;
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]!.absolutePath).toBe(diff);
	});

	it('counts unchanged files in mixed results', async () => {
		const same = path.join(tmpDir, 'same.md');
		fs.writeFileSync(same, 'unchanged-content', 'utf-8');

		const result = await writeSetupFiles(
			[
				makeFile({ path: 'same.md', content: 'unchanged-content' }),
				makeFile({ path: 'new.md', content: 'fresh' })
			],
			{ projectDir: tmpDir, placement: 'project' }
		);

		expect(result.unchanged).toBe(1);
		expect(result.written).toBe(1);
		expect(result.skipped).toBe(0);
		expect(result.backedUp).toBe(0);
	});
});

describe('writeSetupFiles — force does not rewrite identical files', () => {
	it('still reports unchanged under --force when bytes match', async () => {
		const filePath = path.join(tmpDir, 'same.md');
		fs.writeFileSync(filePath, 'same', 'utf-8');
		const mtimeBefore = fs.statSync(filePath).mtimeMs;
		await new Promise((r) => setTimeout(r, 10));

		const result = await writeSetupFiles([makeFile({ path: 'same.md', content: 'same' })], {
			projectDir: tmpDir,
			placement: 'project',
			force: true
		});

		expect(result.unchanged).toBe(1);
		expect(result.written).toBe(0);
		expect(result.files[0]!.outcome).toBe('unchanged');
		expect(fs.statSync(filePath).mtimeMs).toBe(mtimeBefore);
	});
});

describe('writeSetupFiles — JSON mode identity skip', () => {
	it('emits unchanged outcome for identical files (never skipped)', async () => {
		const filePath = path.join(tmpDir, 'same.md');
		fs.writeFileSync(filePath, 'same', 'utf-8');

		const result = await writeSetupFiles([makeFile({ path: 'same.md', content: 'same' })], {
			projectDir: tmpDir,
			placement: 'project',
			isJson: true
		});

		expect(result.unchanged).toBe(1);
		expect(result.skipped).toBe(0);
		expect(result.files[0]!.outcome).toBe('unchanged');
	});
});

describe('writeSetupFiles — dry-run classifies without writing', () => {
	it('reports unchanged for identical targets under --dry-run', async () => {
		const filePath = path.join(tmpDir, 'same.md');
		fs.writeFileSync(filePath, 'same', 'utf-8');
		const mtimeBefore = fs.statSync(filePath).mtimeMs;
		await new Promise((r) => setTimeout(r, 10));

		const result = await writeSetupFiles([makeFile({ path: 'same.md', content: 'same' })], {
			projectDir: tmpDir,
			placement: 'project',
			dryRun: true
		});

		expect(result.unchanged).toBe(1);
		expect(result.written).toBe(0);
		expect(result.files[0]!.outcome).toBe('unchanged');
		expect(fs.statSync(filePath).mtimeMs).toBe(mtimeBefore);
	});

	it('reports written for absent targets under --dry-run (no disk write)', async () => {
		const result = await writeSetupFiles([makeFile({ path: 'new.md', content: 'fresh' })], {
			projectDir: tmpDir,
			placement: 'project',
			dryRun: true
		});

		expect(result.written).toBe(1);
		expect(result.unchanged).toBe(0);
		expect(fs.existsSync(path.join(tmpDir, 'new.md'))).toBe(false);
	});
});

describe('writeSetupFiles — directory at target path', () => {
	it('throws a descriptive error naming the offending path', async () => {
		const dirTarget = path.join(tmpDir, 'blocks-file');
		fs.mkdirSync(dirTarget);

		await expect(
			writeSetupFiles([makeFile({ path: 'blocks-file', content: 'x' })], {
				projectDir: tmpDir,
				placement: 'project'
			})
		).rejects.toThrow(/blocks-file/);
	});

	it('aborts before writing any other files when one target is a directory', async () => {
		const dirTarget = path.join(tmpDir, 'blocks');
		fs.mkdirSync(dirTarget);

		await expect(
			writeSetupFiles(
				[
					makeFile({ path: 'first.md', content: 'one' }),
					makeFile({ path: 'blocks', content: 'two' })
				],
				{ projectDir: tmpDir, placement: 'project' }
			)
		).rejects.toThrow();

		expect(fs.existsSync(path.join(tmpDir, 'first.md'))).toBe(false);
	});
});

describe('writeSetupFiles — unreadable non-symlink target falls through to conflict prompt', () => {
	it('treats a real unreadable file as a conflict (not a hard refusal)', async () => {
		// Simulate an unreadable regular file by creating one with no read permissions.
		const unreadable = path.join(tmpDir, 'locked.txt');
		fs.writeFileSync(unreadable, 'secret');
		fs.chmodSync(unreadable, 0o000);
		mockResolveConflicts.mockResolvedValue(new Map([[unreadable, 'skip']]));

		try {
			const result = await writeSetupFiles([makeFile({ path: 'locked.txt', content: 'x' })], {
				projectDir: tmpDir,
				placement: 'project'
			});

			expect(mockResolveConflicts).toHaveBeenCalledTimes(1);
			const [conflicts] = mockResolveConflicts.mock.calls[0]!;
			expect(conflicts).toHaveLength(1);
			expect(conflicts[0]!.absolutePath).toBe(unreadable);
			expect(result.skipped).toBe(1);
		} finally {
			// Restore perms so tmpDir cleanup succeeds.
			fs.chmodSync(unreadable, 0o644);
		}
	});
});

// ── writeSetupFiles: path containment ────────────────────────────────────────

describe('writeSetupFiles — unsafe paths', () => {
	it('rejects a path with .. segments and writes nothing', async () => {
		await expect(
			writeSetupFiles([makeFile({ path: '../../../evil.txt', content: 'pwn' })], {
				projectDir: tmpDir,
				placement: 'project'
			})
		).rejects.toThrow(/\.\.\/\.\.\/\.\.\/evil\.txt/);

		expect(fs.readdirSync(tmpDir)).toEqual([]);
	});

	it('lists every rejected path in a single consolidated error', async () => {
		const files = [
			makeFile({ path: '../outside.txt', content: 'a' }),
			makeFile({ path: '/abs/evil.txt', content: 'b' }),
			makeFile({ path: 'nested/../../escape.txt', content: 'c' })
		];

		let caught: Error | undefined;
		try {
			await writeSetupFiles(files, { projectDir: tmpDir, placement: 'project' });
		} catch (err) {
			caught = err as Error;
		}

		expect(caught).toBeDefined();
		expect(caught!.message).toContain('../outside.txt');
		expect(caught!.message).toContain('/abs/evil.txt');
		expect(caught!.message).toContain('nested/../../escape.txt');
	});

	it('writes zero files when any path is unsafe, even if other paths are safe', async () => {
		await expect(
			writeSetupFiles(
				[
					makeFile({ path: 'safe.md', content: 'ok' }),
					makeFile({ path: '../escape.txt', content: 'bad' })
				],
				{ projectDir: tmpDir, placement: 'project' }
			)
		).rejects.toThrow();

		expect(fs.existsSync(path.join(tmpDir, 'safe.md'))).toBe(false);
	});
});

// ── writeSetupFiles: symlink refusal ─────────────────────────────────────────

describe('writeSetupFiles — symlink targets', () => {
	it('refuses to overwrite an existing symlink', async () => {
		const sensitive = path.join(tmpDir, 'sensitive-target.txt');
		fs.writeFileSync(sensitive, 'do not touch');
		const linkPath = path.join(tmpDir, 'config.json');
		fs.symlinkSync(sensitive, linkPath);

		await expect(
			writeSetupFiles([makeFile({ path: 'config.json', content: 'hacked' })], {
				projectDir: tmpDir,
				placement: 'project'
			})
		).rejects.toThrow(/symlink/i);

		// Symlink untouched, target untouched
		expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
		expect(fs.readFileSync(sensitive, 'utf-8')).toBe('do not touch');
	});

	it('refuses to overwrite a broken symlink (still a symlink)', async () => {
		const linkPath = path.join(tmpDir, 'broken');
		fs.symlinkSync(path.join(tmpDir, 'does-not-exist'), linkPath);

		await expect(
			writeSetupFiles([makeFile({ path: 'broken', content: 'x' })], {
				projectDir: tmpDir,
				placement: 'project'
			})
		).rejects.toThrow(/symlink/i);

		expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
	});

	it('error message names the offending path', async () => {
		const linkPath = path.join(tmpDir, 'my-link.txt');
		fs.symlinkSync('/tmp/elsewhere', linkPath);

		await expect(
			writeSetupFiles([makeFile({ path: 'my-link.txt', content: 'x' })], {
				projectDir: tmpDir,
				placement: 'project'
			})
		).rejects.toThrow(/my-link\.txt/);
	});
});

// ── writeSetupFiles: global placement path expansion ─────────────────────────

describe('writeSetupFiles — global placement containment', () => {
	it('rejects a .. path under global placement', async () => {
		await expect(
			writeSetupFiles([makeFile({ path: '../../etc/passwd', content: 'pwn' })], {
				placement: 'global'
			})
		).rejects.toThrow(/\.\.\/\.\.\/etc\/passwd/);
	});

	it('rejects an absolute path under global placement', async () => {
		await expect(
			writeSetupFiles([makeFile({ path: '/etc/passwd', content: 'pwn' })], { placement: 'global' })
		).rejects.toThrow(/\/etc\/passwd/);
	});
});

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
