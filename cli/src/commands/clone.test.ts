import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createTestContext } from '../test-utils.js';
import { ApiError } from '../context.js';

// Import after test-utils are available
const { registerClone } = await import('./clone.js');

// ── helpers ───────────────────────────────────────────────────────────────────

let ctx: ReturnType<typeof createTestContext>;

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride();
	registerClone(program, ctx);
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
	ctx = createTestContext({
		io: { isJson: vi.fn(() => false) }
	});
	vi.mocked(ctx.api.get).mockImplementation((url: string) => {
		if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
		return Promise.resolve(SETUP_META);
	});
	vi.mocked(ctx.api.post).mockResolvedValue({});
	vi.mocked(ctx.io.promptDestination).mockResolvedValue('current');
	vi.mocked(ctx.fs.writeSetupFiles).mockResolvedValue(WRITE_RESULT);
	vi.mocked(ctx.io.pickFiles).mockResolvedValue([0, 1]);
	vi.mocked(ctx.io.confirmPostInstall).mockResolvedValue(true);
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
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('rejects format with leading slash', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', '/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('rejects format with trailing slash', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Invalid format'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('accepts a valid HTTPS URL and extracts owner/slug', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'https://coati.sh/alice/my-setup'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup/files');
	});

	it('accepts a valid HTTP URL and extracts owner/slug', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'http://coati.sh/alice/my-setup'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup/files');
	});

	it('accepts a URL with a trailing slash', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'https://coati.sh/alice/my-setup/'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup/files');
	});

	it('rejects URL with extra path segments', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(
			program.parseAsync(['clone', 'https://coati.sh/alice/my-setup/extra'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('extra path segments'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('rejects a malformed URL with a helpful error message', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'https://'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(
			expect.stringContaining('https://coati.sh/owner/slug')
		);
		expect(spy).toHaveBeenCalledWith(1);
	});
});

// ── basic clone flow ───────────────────────────────────────────────────────────

describe('clone — basic flow', () => {
	it('fetches metadata and files then calls writeSetupFiles', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup/files');
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			SETUP_FILES,
			expect.objectContaining({ projectDir: expect.any(String) })
		);
	});

	it('records clone event after writing', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });
		expect(ctx.api.post).toHaveBeenCalledWith('/setups/alice/my-setup/clone', {});
	});

	it('shows warning and exits when no files', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve([]);
			return Promise.resolve(SETUP_META);
		});
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.warning).toHaveBeenCalledWith(expect.stringContaining('no files'));
		expect(spy).toHaveBeenCalledWith(0);
	});

	it('errors and exits on 404', async () => {
		vi.mocked(ctx.api.get).mockRejectedValue(new ApiError('Not Found', 'NOT_FOUND', 404));
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});

// ── --dry-run ─────────────────────────────────────────────────────────────────

describe('clone — --dry-run', () => {
	it('passes dryRun=true to writeSetupFiles', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ dryRun: true })
		);
	});

	it('does not record clone event in dry-run mode', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });
		expect(ctx.api.post).not.toHaveBeenCalled();
	});

	it('does not run post-install in dry-run mode', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'chmod +x setup.sh' });
		});
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });
		expect(ctx.io.confirmPostInstall).not.toHaveBeenCalled();
		expect(ctx.fs.runCommand).not.toHaveBeenCalled();
	});
});

// ── --force ───────────────────────────────────────────────────────────────────

describe('clone — --force', () => {
	it('passes force=true to writeSetupFiles', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--force'], { from: 'user' });
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ force: true })
		);
	});
});

// ── --pick ────────────────────────────────────────────────────────────────────

describe('clone — --pick', () => {
	it('calls pickFiles and filters to selected files', async () => {
		vi.mocked(ctx.io.pickFiles).mockResolvedValue([0]); // select only first file
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick'], { from: 'user' });

		expect(ctx.io.pickFiles).toHaveBeenCalledWith(SETUP_FILES);
		// Only the first file should be passed to writeSetupFiles
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith([SETUP_FILES[0]], expect.anything());
	});

	it('exits with warning when no files selected via --pick', async () => {
		vi.mocked(ctx.io.pickFiles).mockResolvedValue([]);
		const spy = exitSpy();
		const program = makeProgram();
		await expect(
			program.parseAsync(['clone', 'alice/my-setup', '--pick'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(ctx.io.warning).toHaveBeenCalledWith(expect.stringContaining('No files selected'));
		expect(ctx.fs.writeSetupFiles).not.toHaveBeenCalled();
		expect(spy).toHaveBeenCalledWith(0);
	});

	it('skips pick prompt in JSON mode', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick', '--json'], { from: 'user' });

		expect(ctx.io.pickFiles).not.toHaveBeenCalled();
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(SETUP_FILES, expect.anything());
	});

	it('--pick + --force passes force=true to writeSetupFiles with filtered files', async () => {
		vi.mocked(ctx.io.pickFiles).mockResolvedValue([1]); // select only second file
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick', '--force'], { from: 'user' });

		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
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

		expect(ctx.io.promptDestination).not.toHaveBeenCalled();
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: path.resolve('/tmp/my-project') })
		);
	});

	it('resolves --dir to absolute path', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dir', 'relative/path'], {
			from: 'user'
		});

		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: path.resolve('relative/path') })
		);
	});
});

// ── post-install ──────────────────────────────────────────────────────────────

describe('clone — post-install', () => {
	it('prompts and executes post-install command when confirmed', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});
		vi.mocked(ctx.io.confirmPostInstall).mockResolvedValue(true);
		vi.mocked(ctx.fs.runCommand).mockResolvedValue({ stdout: 'hello\n', stderr: '' });

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).toHaveBeenCalledWith('echo hello');
		expect(ctx.fs.runCommand).toHaveBeenCalled();
	});

	it('skips post-install when user declines confirmation', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});
		vi.mocked(ctx.io.confirmPostInstall).mockResolvedValue(false);

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).toHaveBeenCalled();
		expect(ctx.fs.runCommand).not.toHaveBeenCalled();
	});

	it('skips post-install when --no-post-install is passed', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--no-post-install'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).not.toHaveBeenCalled();
		expect(ctx.fs.runCommand).not.toHaveBeenCalled();
	});

	it('does not prompt when setup has no postInstall', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).not.toHaveBeenCalled();
		expect(ctx.fs.runCommand).not.toHaveBeenCalled();
	});

	it('does not prompt when postInstall is empty string', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: '   ' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).not.toHaveBeenCalled();
	});

	it('skips post-install in JSON mode', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--json'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).not.toHaveBeenCalled();
		expect(ctx.fs.runCommand).not.toHaveBeenCalled();
	});

	it('dry-run skips post-install even when setup has postInstall', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });

		expect(ctx.io.confirmPostInstall).not.toHaveBeenCalled();
	});
});

// ── clone tracking ────────────────────────────────────────────────────────────

describe('clone — tracking file', () => {
	it('writes coati.json with tracking fields after a successful clone', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.fs.writeJson).toHaveBeenCalledWith(
			expect.stringContaining('coati.json'),
			expect.objectContaining({
				source: 'alice/my-setup',
				clonedAt: expect.any(String),
				revision: expect.any(String)
			})
		);
	});

	it('does not write coati.json in dry-run mode', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run'], { from: 'user' });

		expect(ctx.fs.writeJson).not.toHaveBeenCalled();
	});
});

// ── error messages ────────────────────────────────────────────────────────────

describe('clone — error messages', () => {
	it('404 error includes suggestion to check spelling and explore URL', async () => {
		vi.mocked(ctx.api.get).mockRejectedValue(new ApiError('Not Found', 'NOT_FOUND', 404));
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('https://coati.sh/explore'));
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('ECONNREFUSED shows distinct network error message', async () => {
		const netErr = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
		vi.mocked(ctx.api.get).mockRejectedValue(netErr);
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(
			expect.stringContaining('Could not reach the Coati API')
		);
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('ENOTFOUND shows distinct network error message', async () => {
		const netErr = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });
		vi.mocked(ctx.api.get).mockRejectedValue(netErr);
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).toHaveBeenCalledWith(
			expect.stringContaining('Could not reach the Coati API')
		);
		expect(spy).toHaveBeenCalledWith(1);
	});

	it('network error is distinct from 404 not-found message', async () => {
		const netErr = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
		vi.mocked(ctx.api.get).mockRejectedValue(netErr);
		const spy = exitSpy();
		const program = makeProgram();
		await expect(program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' })).rejects.toThrow(
			'process.exit'
		);
		expect(ctx.io.error).not.toHaveBeenCalledWith(expect.stringContaining('not found'));
		expect(spy).toHaveBeenCalledWith(1);
	});
});

// ── --json output ─────────────────────────────────────────────────────────────

describe('clone — --json output', () => {
	it('outputs JSON with all required fields', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--json'], { from: 'user' });

		expect(ctx.io.json).toHaveBeenCalledWith(
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
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dry-run', '--json'], { from: 'user' });

		expect(ctx.io.json).toHaveBeenCalledWith(expect.objectContaining({ dryRun: true }));
	});

	it('JSON output with --no-post-install has ran=false', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, postInstall: 'echo hello' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--no-post-install', '--json'], {
			from: 'user'
		});

		expect(ctx.io.json).toHaveBeenCalledWith(
			expect.objectContaining({ postInstall: expect.objectContaining({ ran: false }) })
		);
	});
});
