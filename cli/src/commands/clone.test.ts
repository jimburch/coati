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
	{ id: 'f1', path: 'CLAUDE.md', content: '# Hello' },
	{ id: 'f2', path: '.claude/settings.json', content: '{}' }
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

	it('rejects HTTP URLs (non-HTTPS)', async () => {
		const spy = exitSpy();
		const program = makeProgram();
		await expect(
			program.parseAsync(['clone', 'http://coati.sh/alice/my-setup'], { from: 'user' })
		).rejects.toThrow('process.exit');
		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Non-HTTPS'));
		expect(spy).toHaveBeenCalledWith(1);
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
			SETUP_FILES.map((f) => ({ path: f.path, content: f.content })),
			expect.objectContaining({ projectDir: expect.any(String) })
		);
	});

	it('records clone event after writing', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });
		expect(ctx.api.post).toHaveBeenCalledWith('/setups/alice/my-setup/clone', {});
	});

	it('displays safety warning before file writing in interactive mode', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		const infoCalls = vi.mocked(ctx.io.info).mock.calls.map((c) => c[0]);
		const reviewIdx = infoCalls.findIndex((msg) =>
			msg.includes('Review setup contents before installing: https://coati.sh/alice/my-setup')
		);
		const communityIdx = infoCalls.findIndex((msg) =>
			msg.includes('Coati setups are community-contributed and not verified.')
		);

		expect(reviewIdx).toBeGreaterThanOrEqual(0);
		expect(communityIdx).toBeGreaterThanOrEqual(0);

		// Both warning lines must appear before writeSetupFiles is called
		const writeOrder = vi.mocked(ctx.fs.writeSetupFiles).mock.invocationCallOrder[0]!;
		const infoOrders = vi.mocked(ctx.io.info).mock.invocationCallOrder;
		expect(infoOrders[reviewIdx]!).toBeLessThan(writeOrder);
		expect(infoOrders[communityIdx]!).toBeLessThan(writeOrder);
	});

	it('does not display safety warning when --json flag is used', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--json'], { from: 'user' });

		const infoCalls = vi.mocked(ctx.io.info).mock.calls.map((c) => c[0]);
		expect(infoCalls.some((msg) => msg.includes('Review setup contents before installing'))).toBe(
			false
		);
		expect(infoCalls.some((msg) => msg.includes('community-contributed'))).toBe(false);
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

		expect(ctx.io.pickFiles).toHaveBeenCalledWith(SETUP_FILES.map((f) => ({ path: f.path })));
		// Only the first file should be passed to writeSetupFiles
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			[{ path: SETUP_FILES[0]!.path, content: SETUP_FILES[0]!.content }],
			expect.anything()
		);
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
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			SETUP_FILES.map((f) => ({ path: f.path, content: f.content })),
			expect.anything()
		);
	});

	it('--pick + --force passes force=true to writeSetupFiles with filtered files', async () => {
		vi.mocked(ctx.io.pickFiles).mockResolvedValue([1]); // select only second file
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--pick', '--force'], { from: 'user' });

		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			[{ path: SETUP_FILES[1]!.path, content: SETUP_FILES[1]!.content }],
			expect.objectContaining({ force: true })
		);
	});
});

// ── placement prompt ──────────────────────────────────────────────────────────

describe('clone — placement prompt', () => {
	it('prompts for destination when no placement flag is passed', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.io.promptDestination).toHaveBeenCalled();
	});

	it('selecting "current" installs to cwd', async () => {
		vi.mocked(ctx.io.promptDestination).mockResolvedValue('current');
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: process.cwd() })
		);
	});

	it('selecting "global" installs to ~/.coati/setups/owner/slug', async () => {
		vi.mocked(ctx.io.promptDestination).mockResolvedValue('global');
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		const globalPath = path.join(os.homedir(), '.coati', 'setups', 'alice', 'my-setup');
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: globalPath })
		);
	});

	it('skips placement prompt in JSON mode', async () => {
		vi.mocked(ctx.io.isJson).mockReturnValue(true);
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--json'], { from: 'user' });

		expect(ctx.io.promptDestination).not.toHaveBeenCalled();
	});
});

// ── --global flag ─────────────────────────────────────────────────────────────

describe('clone — --global flag', () => {
	it('skips prompt and installs to ~/.coati/setups/owner/slug', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--global'], { from: 'user' });

		const globalPath = path.join(os.homedir(), '.coati', 'setups', 'alice', 'my-setup');
		expect(ctx.io.promptDestination).not.toHaveBeenCalled();
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: globalPath })
		);
	});
});

// ── --project flag ────────────────────────────────────────────────────────────

describe('clone — --project flag', () => {
	it('skips prompt and installs to cwd', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--project'], { from: 'user' });

		expect(ctx.io.promptDestination).not.toHaveBeenCalled();
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: process.cwd() })
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

	it('--dir takes precedence over --global', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dir', '/tmp/custom', '--global'], {
			from: 'user'
		});

		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: path.resolve('/tmp/custom') })
		);
	});

	it('--dir takes precedence over --project', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup', '--dir', '/tmp/custom', '--project'], {
			from: 'user'
		});

		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: path.resolve('/tmp/custom') })
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

	it('writes sourceId (UUID) from setup metadata into coati.json', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.fs.writeJson).toHaveBeenCalledWith(
			expect.stringContaining('coati.json'),
			expect.objectContaining({
				sourceId: 'setup-1'
			})
		);
	});

	it('refreshes source from server ownerUsername/slug (handles renamed setups)', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve({ ...SETUP_META, ownerUsername: 'alice', slug: 'renamed-setup' });
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.fs.writeJson).toHaveBeenCalledWith(
			expect.stringContaining('coati.json'),
			expect.objectContaining({
				source: 'alice/renamed-setup'
			})
		);
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

// ── team clone routing ────────────────────────────────────────────────────────

const TEAM_SETUP_META = {
	id: 'team-setup-1',
	name: 'shared-setup',
	slug: 'shared-setup',
	description: 'A team setup',
	ownerUsername: 'alice',
	clonesCount: 2,
	starsCount: 3,
	postInstall: null
};

describe('clone — team routing (three-part)', () => {
	it('routes three-part org/team/setup to team endpoints', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve(TEAM_SETUP_META);
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'org/acme/shared-setup'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/teams/acme/setups/shared-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/teams/acme/setups/shared-setup/files');
		expect(ctx.api.post).toHaveBeenCalledWith('/teams/acme/setups/shared-setup/clone', {});
	});

	it('routes https://coati.sh/org/team/setup URL to team endpoints', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve(TEAM_SETUP_META);
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'https://coati.sh/org/acme/shared-setup'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/teams/acme/setups/shared-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/teams/acme/setups/shared-setup/files');
		expect(ctx.api.post).toHaveBeenCalledWith('/teams/acme/setups/shared-setup/clone', {});
	});

	it('two-part input still routes to personal endpoints', async () => {
		const program = makeProgram();
		await program.parseAsync(['clone', 'alice/my-setup'], { from: 'user' });

		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup');
		expect(ctx.api.get).toHaveBeenCalledWith('/setups/alice/my-setup/files');
		expect(ctx.api.post).toHaveBeenCalledWith('/setups/alice/my-setup/clone', {});
	});

	it('writes coati.json with teamSlug/setupSlug as source for team clones', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve(TEAM_SETUP_META);
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'org/acme/shared-setup'], { from: 'user' });

		expect(ctx.fs.writeJson).toHaveBeenCalledWith(
			expect.stringContaining('coati.json'),
			expect.objectContaining({
				source: 'acme/shared-setup',
				sourceId: 'team-setup-1',
				clonedAt: expect.any(String),
				revision: expect.any(String)
			})
		);
	});

	it('team clone stub contains only source, sourceId, clonedAt, revision', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve(TEAM_SETUP_META);
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'org/acme/shared-setup'], { from: 'user' });

		const [, stubData] = vi.mocked(ctx.fs.writeJson).mock.calls[0]!;
		const keys = Object.keys(stubData as object).sort();
		expect(keys).toEqual(['clonedAt', 'revision', 'source', 'sourceId']);
	});

	it('uses teamSlug/setupSlug for --global path in team clone', async () => {
		vi.mocked(ctx.api.get).mockImplementation((url: string) => {
			if (url.endsWith('/files')) return Promise.resolve(SETUP_FILES);
			return Promise.resolve(TEAM_SETUP_META);
		});

		const program = makeProgram();
		await program.parseAsync(['clone', 'org/acme/shared-setup', '--global'], { from: 'user' });

		const expectedPath = path.join(os.homedir(), '.coati', 'setups', 'acme', 'shared-setup');
		expect(ctx.fs.writeSetupFiles).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ projectDir: expectedPath })
		);
	});
});
