import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

// ── mock auth module ──────────────────────────────────────────────────────────

const mockIsLoggedIn = vi.fn<() => boolean>();
const mockServerLogout = vi.fn();
const mockClearCredentials = vi.fn();

vi.mock('../auth.js', () => ({
	isLoggedIn: mockIsLoggedIn,
	serverLogout: mockServerLogout,
	clearCredentials: mockClearCredentials,
	requestDeviceCode: vi.fn(),
	pollForToken: vi.fn(),
	storeCredentials: vi.fn(),
	verifyToken: vi.fn()
}));

// ── mock output module ────────────────────────────────────────────────────────

const mockError = vi.fn();
const mockSuccess = vi.fn();
const mockPrint = vi.fn();
const mockJson = vi.fn();
const mockIsJsonMode = vi.fn(() => false);
const mockSetOutputMode = vi.fn();

vi.mock('../output.js', () => ({
	setOutputMode: mockSetOutputMode,
	isJsonMode: mockIsJsonMode,
	error: mockError,
	success: mockSuccess,
	print: mockPrint,
	json: mockJson
}));

// ── mock config module ────────────────────────────────────────────────────────

vi.mock('../config.js', () => ({
	configDir: '/home/testuser/.coati',
	getConfig: vi.fn(() => ({ apiBase: 'https://coati.sh/api/v1' })),
	setConfig: vi.fn(),
	clearConfig: vi.fn()
}));

// Import logout command after mocks are set up
const { registerLogout } = await import('./logout.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride(); // prevent process.exit from actually exiting
	registerLogout(program);
	return program;
}

// ── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockIsJsonMode.mockReturnValue(false);
	mockServerLogout.mockResolvedValue(undefined);
	mockClearCredentials.mockReturnValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── not-logged-in path ────────────────────────────────────────────────────────

describe('not logged in', () => {
	it('prints friendly message and exits with code 0', async () => {
		mockIsLoggedIn.mockReturnValue(false);

		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(program.parseAsync(['node', 'coati', 'logout'])).rejects.toThrow(
			'process.exit called'
		);

		expect(mockPrint).toHaveBeenCalledWith(expect.stringContaining('Not logged in'));
		expect(exitSpy).toHaveBeenCalledWith(0);
		expect(mockServerLogout).not.toHaveBeenCalled();
		expect(mockClearCredentials).not.toHaveBeenCalled();
	});

	it('outputs JSON with loggedIn: false when --json and not logged in', async () => {
		mockIsLoggedIn.mockReturnValue(false);
		mockIsJsonMode.mockReturnValue(true);

		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(program.parseAsync(['node', 'coati', 'logout', '--json'])).rejects.toThrow(
			'process.exit called'
		);

		expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ loggedIn: false }));
		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});

// ── logged-in path ────────────────────────────────────────────────────────────

describe('logged in', () => {
	it('calls serverLogout, clears credentials, and prints confirmation', async () => {
		mockIsLoggedIn.mockReturnValue(true);

		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'logout']);

		expect(mockServerLogout).toHaveBeenCalledTimes(1);
		expect(mockClearCredentials).toHaveBeenCalledTimes(1);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('Logged out'));
	});

	it('still clears credentials even if serverLogout fails', async () => {
		mockIsLoggedIn.mockReturnValue(true);
		mockServerLogout.mockRejectedValue(new Error('Server unreachable'));

		const program = makeProgram();
		// serverLogout errors are swallowed in auth.ts, so this should not throw
		await program.parseAsync(['node', 'coati', 'logout']);

		expect(mockClearCredentials).toHaveBeenCalledTimes(1);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('Logged out'));
	});

	it('outputs JSON with success: true when --json', async () => {
		mockIsLoggedIn.mockReturnValue(true);
		mockIsJsonMode.mockReturnValue(true);

		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'logout', '--json']);

		expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
		expect(mockClearCredentials).toHaveBeenCalledTimes(1);
	});
});
