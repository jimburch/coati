import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

// ── hoisted class definitions ─────────────────────────────────────────────────

const { MockApiError } = vi.hoisted(() => {
	class MockApiError extends Error {
		code: string;
		status: number;
		constructor(message: string, code: string, status: number) {
			super(message);
			this.name = 'ApiError';
			this.code = code;
			this.status = status;
		}
	}
	return { MockApiError };
});

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../api.js', () => ({
	get: (...args: unknown[]) => mockGet(...args),
	post: (...args: unknown[]) => mockPost(...args),
	ApiError: MockApiError
}));

const mockSetOutputMode = vi.fn();
const mockIsJsonMode = vi.fn(() => false);
const mockJson = vi.fn();
const mockPrint = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();
const mockWarning = vi.fn();
const mockInfo = vi.fn();

vi.mock('../output.js', () => ({
	setOutputMode: (mode: string) => mockSetOutputMode(mode),
	isJsonMode: () => mockIsJsonMode(),
	json: (data: unknown) => mockJson(data),
	print: (msg: string) => mockPrint(msg),
	success: (msg: string) => mockSuccess(msg),
	error: (msg: string) => mockError(msg),
	warning: (msg: string) => mockWarning(msg),
	info: (msg: string) => mockInfo(msg)
}));

const mockWriteSetupFiles = vi.fn();

vi.mock('../files.js', () => ({
	writeSetupFiles: (...args: unknown[]) => mockWriteSetupFiles(...args)
}));

const mockPromptDestination = vi.fn();
const mockConfirmPostInstall = vi.fn();
const mockPickFiles = vi.fn();

vi.mock('../prompts.js', () => ({
	promptDestination: () => mockPromptDestination(),
	confirmPostInstall: (cmd: string) => mockConfirmPostInstall(cmd),
	pickFiles: (files: unknown) => mockPickFiles(files),
	confirm: vi.fn(),
	select: vi.fn(),
	input: vi.fn(),
	resolveConflict: vi.fn(),
	confirmFileList: vi.fn(),
	promptMetadata: vi.fn()
}));

const mockExec = vi.fn();

vi.mock('child_process', () => ({
	exec: (...args: unknown[]) => mockExec(...args)
}));

// Import after mocks are registered
const { registerClone } = await import('./clone.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride();
	registerClone(program);
	return program;
}

function exitSpy() {
	return vi.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('process.exit');
	});
}

const SETUP_META = {
	id: 'setup-1',
	name: 'my-setup',
	slug: 'my-setup',
	description: 'A test setup',
	ownerUsername: 'alice',
	clonesCount: 5,
	starsCount: 10,
	postInstall: null
};

const SETUP_FILES = [
	{ id: 'f1', source: 'CLAUDE.md', target: 'CLAUDE.md', placement: 'project', content: '# Hello' },
	{
		id: 'f2',
		source: 'settings.json',
		target: '~/.claude/settings.json',
		placement: 'global',
		content: '{}'
	}
];

const WRITE_RESULT = {
	written: 2,
	skipped: 0,
	backedUp: 0,
	files: [
		{ target: path.join(process.cwd(), 'CLAUDE.md'), outcome: 'written' as const },
		{ target: path.join(os.homedir(), '.claude/settings.json'), outcome: 'written' as const }
	]
};

beforeEach(() => {
	vi.clearAllMocks();
	mockIsJsonMode.mockReturnValue(false);
	mockGet.mockImplementation((url: string) => {
		if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
		return Promise.resolve(SETUP_META);
	});
	mockPost.mockResolvedValue({});
	mockPromptDestination.mockResolvedValue('current');
	mockWriteSetupFiles.mockResolvedValue(WRITE_RESULT);
	mockPickFiles.mockResolvedValue([0, 1]);
	mockConfirmPostInstall.mockResolvedValue(true);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── argument parsing ───────────────────────────────────────────────────────────

describe('clone — argument parsing', () => {
	it('rejects invalid format (no slash)', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alicemysetup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('rejects format with leading slash', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', '/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('rejects format with trailing slash', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});

// ── basic clone flow ───────────────────────────────────────────────────────────

describe('clone — basic flow', () => {
	it('fetches metadata and files then calls writeSetupFiles', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(mockGet).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(mockGet).toHaveBeenCalledWith('/setups/alice/my-setup/files');
		expect(mockWriteSetupFiles).toHaveBeenCalledWith(
			SETUP_FILES,
			expect.objectContaining({ projectDir: expect.any(String) })
		);
	});

	it('records clone event after writing', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });
		expect(mockPost).toHaveBeenCalledWith('/setups/alice/my-setup/clone', {});
	});

	it('shows warning and exits when no files', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve([]);
			return Promise.resolve(SETUP_META);
		});
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('no files'));
		expect(spy).toHaveBeenCalledWith(0);
	});
});

// ── --dry-run ─────────────────────────────────────────────────────────────────

describe('clone — --dry-run', () => {
	it('passes dryRun=true to writeSetupFiles', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });
		expect(mockWriteSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ dryRun: true })
		);
	});

	it('does not record clone event in dry-run mode', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });
		expect(mockPost).not.toHaveBeenCalled();
	});

	it('does not run post-install in dry-run mode', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'chmod +x setup.sh' });
		});
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });
		expect(mockConfirmPostInstall).not.toHaveBeenCalled();
		expect(mockExec).not.toHaveBeenCalled();
	});
});

// ── --force ───────────────────────────────────────────────────────────────────

describe('clone — --force', () => {
	it('passes force=true to writeSetupFiles', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--force'], { from: 'user' });
		expect(mockWriteSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ force: true })
		);
	});
});

// ── --pick ────────────────────────────────────────────────────────────────────

describe('clone — --pick', () => {
	it('calls pickFiles and filters to selected files', async () => {
		mockPickFiles.mockResolvedValue([0]); // select only first file
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick'], { from: 'user' });

		expect(mockPickFiles).toHaveBeenCalledWith(SETUP_FILES);
		// Only the first file should be passed to writeSetupFiles
		expect(mockWriteSetupFiles).toHaveBeenCalledWith([SETUP_FILES[0]], expect.anything());
	});

	it('exits with warning when no files selected via --pick', async () => {
		mockPickFiles.mockResolvedValue([]);
		const spy = exitSpy();
		const program = makeProgram();
		await expect(
			program.parseAsync(['clone', 'alice/my-setup', '--pick'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('No files selected'));
		expect(mockWriteSetupFiles).not.toHaveBeenCalled();
		expect(spy).toHaveBeenCalledWith(0);
	});

	it('skips pick prompt in JSON mode', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick', '--json'], { from: 'user' });

		expect(mockPickFiles).not.toHaveBeenCalled();
		expect(mockWriteSetupFiles).toHaveBeenCalledWith(SETUP_FILES, expect.anything());
	});

	it('--pick + --force passes force=true to writeSetupFiles with filtered files', async () => {
		mockPickFiles.mockResolvedValue([1]); // select only second file
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick', '--force'], { from: 'user' });

		expect(mockWriteSetupFiles).toHaveBeenCalledWith(
			[SETUP_FILES[1]],
			expect.objectContaining({ force: true })
		);
	});
});

// ── --dir ─────────────────────────────────────────────────────────────────────

describe('clone — --dir', () => {
	it('skips destination prompt when --dir is provided', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dir', '/tmp/my-project'], {
			from: 'user'
		});

		expect(mockPromptDestination).not.toHaveBeenCalled();
		expect(mockWriteSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: path.resolve('/tmp/my-project') })
		);
	});

	it('resolves --dir to absolute path', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dir', 'relative/path'], {
			from: 'user'
		});

		expect(mockWriteSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: path.resolve('relative/path') })
		);
	});
});

// ── post-install ──────────────────────────────────────────────────────────────

describe('clone — post-install', () => {
	it('prompts and executes post-install command when confirmed', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});
		mockConfirmPostInstall.mockResolvedValue(true);
		mockExec.mockImplementation(
			(_cmd: string, _opts: unknown, cb: (err: null, stdout: string, stderr: string) => void) => {
				cb(null, 'hello\n', '');
			}
		);

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(mockConfirmPostInstall).toHaveBeenCalledWith('echo hello');
		expect(mockExec).toHaveBeenCalled();
	});

	it('skips post-install when user declines confirmation', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});
		mockConfirmPostInstall.mockResolvedValue(false);

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(mockConfirmPostInstall).toHaveBeenCalled();
		expect(mockExec).not.toHaveBeenCalled();
	});

	it('skips post-install when --no-post-install is passed', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--no-post-install'], { from: 'user' });

		expect(mockConfirmPostInstall).not.toHaveBeenCalled();
		expect(mockExec).not.toHaveBeenCalled();
	});

	it('does not prompt when setup has no postInstall', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(mockConfirmPostInstall).not.toHaveBeenCalled();
		expect(mockExec).not.toHaveBeenCalled();
	});

	it('does not prompt when postInstall is empty string', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: '   ' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(mockConfirmPostInstall).not.toHaveBeenCalled();
	});

	it('skips post-install in JSON mode', async () => {
		mockIsJsonMode.mockReturnValue(true);
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--json'], { from: 'user' });

		expect(mockConfirmPostInstall).not.toHaveBeenCalled();
		expect(mockExec).not.toHaveBeenCalled();
	});

	it('dry-run skips post-install even when setup has postInstall', async () => {
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });

		expect(mockConfirmPostInstall).not.toHaveBeenCalled();
	});
});

// ── --json output ─────────────────────────────────────────────────────────────

describe('clone — --json output', () => {
	it('outputs JSON with all required fields', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--json'], { from: 'user' });

		expect(mockJson).toHaveBeenCalledWith(
			expect.objectContaining({
				setup: expect.objectContaining({ owner: 'alice', slug: 'my-setup' }),
				dryRun: false,
				written: expect.any(Number),
				skipped: expect.any(Number),
				backedUp: expect.any(Number),
				files: expect.any(Array),
				postInstall: expect.objectContaining({ ran: false })
			})
		);
	});

	it('dry-run JSON includes dryRun=true', async () => {
		mockIsJsonMode.mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run', '--json'], { from: 'user' });

		expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
	});

	it('JSON output with --no-post-install has ran=false', async () => {
		mockIsJsonMode.mockReturnValue(true);
		mockGet.mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--no-post-install', '--json'], {
			from: 'user'
		});

		expect(mockJson).toHaveBeenCalledWith(
			expect.objectContaining({ postInstall: expect.objectContaining({ ran: false }) })
		);
	});
});
