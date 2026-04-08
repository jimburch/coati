import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createTestContext } from '../test-utils.js';
import { registerLogin } from './login.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(ctx: ReturnType<typeof createTestContext>): Command {
	const program = new Command();
	program.exitOverride(); // prevent process.exit from actually exiting
	registerLogin(program, ctx);
	return program;
}

const DEVICE_INFO = {
	deviceCode: 'dc_test',
	userCode: 'WXYZ-5678',
	verificationUri: 'https://github.com/activate',
	expiresIn: 900,
	interval: 5
};

// ── setup / teardown ─────────────────────────────────────────────────────────

function makeCtx() {
	return createTestContext({
		auth: {
			isLoggedIn: vi.fn(() => false),
			requestDeviceCode: vi.fn().mockResolvedValue(DEVICE_INFO),
			pollForToken: vi.fn().mockResolvedValue({ token: 'tok_123', username: 'testuser' }),
			storeCredentials: vi.fn(),
			verifyToken: vi.fn().mockResolvedValue('testuser')
		}
	});
}

afterEach(() => {
	vi.restoreAllMocks();
});

// ── already-logged-in guard ───────────────────────────────────────────────────

describe('already logged in guard', () => {
	it('prints an error and exits when already logged in (no --force)', async () => {
		const ctx = makeCtx();
		vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(true);

		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(
			makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser'])
		).rejects.toThrow('process.exit called');

		expect(ctx.io.error).toHaveBeenCalledWith(expect.stringContaining('Already logged in'));
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(ctx.auth.requestDeviceCode).not.toHaveBeenCalled();
	});

	it('proceeds when already logged in but --force is passed', async () => {
		const ctx = makeCtx();
		vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(true);

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--force', '--no-browser']);

		expect(ctx.auth.requestDeviceCode).toHaveBeenCalled();
		expect(ctx.auth.storeCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
	});

	it('proceeds normally when not logged in', async () => {
		const ctx = makeCtx();

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser']);

		expect(ctx.auth.requestDeviceCode).toHaveBeenCalled();
		expect(ctx.auth.storeCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
	});
});

// ── --force flag ──────────────────────────────────────────────────────────────

describe('--force flag', () => {
	it('bypasses the already-logged-in check and completes login', async () => {
		const ctx = makeCtx();
		vi.mocked(ctx.auth.isLoggedIn).mockReturnValue(true);

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--force', '--no-browser']);

		expect(ctx.auth.requestDeviceCode).toHaveBeenCalledTimes(1);
		expect(ctx.auth.pollForToken).toHaveBeenCalledWith('dc_test', 5, 900);
		expect(ctx.auth.storeCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('testuser'));
	});
});

// ── device flow error handling ────────────────────────────────────────────────

describe('device flow errors', () => {
	it('prints error and exits if requestDeviceCode fails', async () => {
		const ctx = makeCtx();
		vi.mocked(ctx.auth.requestDeviceCode).mockRejectedValue(new Error('Network error'));

		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(
			makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser'])
		).rejects.toThrow('process.exit called');

		expect(ctx.io.error).toHaveBeenCalledWith('Network error');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('prints error and exits if pollForToken fails', async () => {
		const ctx = makeCtx();
		vi.mocked(ctx.auth.pollForToken).mockRejectedValue(new Error('Authorization failed'));

		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(
			makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser'])
		).rejects.toThrow('process.exit called');

		expect(ctx.io.error).toHaveBeenCalledWith('Authorization failed');
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('completes login even if verifyToken fails', async () => {
		const ctx = makeCtx();
		vi.mocked(ctx.auth.verifyToken).mockRejectedValue(new Error('Verify failed'));

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser']);

		expect(ctx.auth.storeCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('testuser'));
	});
});

// ── --json flag ───────────────────────────────────────────────────────────────

describe('--json flag', () => {
	it('outputs JSON with success and username on successful login', async () => {
		const ctx = createTestContext({
			auth: {
				isLoggedIn: vi.fn(() => false),
				requestDeviceCode: vi.fn().mockResolvedValue(DEVICE_INFO),
				pollForToken: vi.fn().mockResolvedValue({ token: 'tok_123', username: 'testuser' }),
				storeCredentials: vi.fn(),
				verifyToken: vi.fn().mockResolvedValue('testuser')
			},
			io: { isJson: vi.fn(() => true) }
		});

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--json', '--no-browser']);

		expect(ctx.io.json).toHaveBeenCalledWith(
			expect.objectContaining({ success: true, username: 'testuser' })
		);
	});
});

// ── success output ────────────────────────────────────────────────────────────

describe('success output', () => {
	it('prints success message with username', async () => {
		const ctx = makeCtx();

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser']);

		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('testuser'));
	});

	it('shows device code info before polling', async () => {
		const ctx = makeCtx();

		await makeProgram(ctx).parseAsync(['node', 'coati', 'login', '--no-browser']);

		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining(DEVICE_INFO.verificationUri));
		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining(DEVICE_INFO.userCode));
	});
});

// ── beforeEach for all tests ──────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});
