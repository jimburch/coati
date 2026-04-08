import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';
import { createTestContext } from '../test-utils.js';
import { registerLogout } from './logout.js';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(ctx: ReturnType<typeof createTestContext>): Command {
	const program = new Command();
	program.exitOverride(); // prevent process.exit from actually exiting
	registerLogout(program, ctx);
	return program;
}

afterEach(() => {
	vi.restoreAllMocks();
});

// ── not-logged-in path ────────────────────────────────────────────────────────

describe('not logged in', () => {
	it('prints friendly message and exits with code 0', async () => {
		const ctx = createTestContext({
			auth: { isLoggedIn: vi.fn(() => false) }
		});
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(makeProgram(ctx).parseAsync(['node', 'coati', 'logout'])).rejects.toThrow(
			'process.exit called'
		);

		expect(ctx.io.print).toHaveBeenCalledWith(expect.stringContaining('Not logged in'));
		expect(exitSpy).toHaveBeenCalledWith(0);
		expect(ctx.auth.serverLogout).not.toHaveBeenCalled();
		expect(ctx.auth.clearCredentials).not.toHaveBeenCalled();
	});

	it('outputs JSON with loggedIn: false when --json and not logged in', async () => {
		const ctx = createTestContext({
			auth: { isLoggedIn: vi.fn(() => false) },
			io: { isJson: vi.fn(() => true) }
		});
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(
			makeProgram(ctx).parseAsync(['node', 'coati', 'logout', '--json'])
		).rejects.toThrow('process.exit called');

		expect(ctx.io.json).toHaveBeenCalledWith(expect.objectContaining({ loggedIn: false }));
		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});

// ── logged-in path ────────────────────────────────────────────────────────────

describe('logged in', () => {
	it('calls serverLogout, clears credentials, and prints confirmation', async () => {
		const ctx = createTestContext({
			auth: {
				isLoggedIn: vi.fn(() => true),
				serverLogout: vi.fn().mockResolvedValue(undefined)
			}
		});

		await makeProgram(ctx).parseAsync(['node', 'coati', 'logout']);

		expect(ctx.auth.serverLogout).toHaveBeenCalledTimes(1);
		expect(ctx.auth.clearCredentials).toHaveBeenCalledTimes(1);
		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('Logged out'));
	});

	it('still clears credentials even if serverLogout fails', async () => {
		const ctx = createTestContext({
			auth: {
				isLoggedIn: vi.fn(() => true),
				serverLogout: vi.fn().mockRejectedValue(new Error('Server unreachable'))
			}
		});

		await makeProgram(ctx).parseAsync(['node', 'coati', 'logout']);

		expect(ctx.auth.clearCredentials).toHaveBeenCalledTimes(1);
		expect(ctx.io.success).toHaveBeenCalledWith(expect.stringContaining('Logged out'));
	});

	it('outputs JSON with success: true when --json', async () => {
		const ctx = createTestContext({
			auth: {
				isLoggedIn: vi.fn(() => true),
				serverLogout: vi.fn().mockResolvedValue(undefined)
			},
			io: { isJson: vi.fn(() => true) }
		});

		await makeProgram(ctx).parseAsync(['node', 'coati', 'logout', '--json']);

		expect(ctx.io.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
		expect(ctx.auth.clearCredentials).toHaveBeenCalledTimes(1);
	});
});
