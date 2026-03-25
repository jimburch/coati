import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

// ── mock auth module ──────────────────────────────────────────────────────────

const mockIsLoggedIn = vi.fn<() => boolean>();
const mockRequestDeviceCode = vi.fn();
const mockPollForToken = vi.fn();
const mockStoreCredentials = vi.fn();
const mockVerifyToken = vi.fn();

vi.mock('../auth.js', () => ({
	isLoggedIn: mockIsLoggedIn,
	requestDeviceCode: mockRequestDeviceCode,
	pollForToken: mockPollForToken,
	storeCredentials: mockStoreCredentials,
	verifyToken: mockVerifyToken,
	serverLogout: vi.fn()
}));

// ── mock output module ────────────────────────────────────────────────────────

const mockError = vi.fn();
const mockSuccess = vi.fn();
const mockPrint = vi.fn();
const mockJson = vi.fn();

vi.mock('../output.js', () => ({
	setOutputMode: vi.fn(),
	isJsonMode: vi.fn(() => false),
	error: mockError,
	success: mockSuccess,
	print: mockPrint,
	json: mockJson
}));

// ── mock 'open' package ───────────────────────────────────────────────────────

vi.mock('open', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

// Import login command after mocks are set up
const { registerLogin } = await import('./login.js');

// ── helpers ───────────────────────────────────────────────────────────────────

function makeProgram(): Command {
	const program = new Command();
	program.exitOverride(); // prevent process.exit from actually exiting
	registerLogin(program);
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

beforeEach(() => {
	vi.clearAllMocks();
	mockVerifyToken.mockResolvedValue('testuser');
	mockRequestDeviceCode.mockResolvedValue(DEVICE_INFO);
	mockPollForToken.mockResolvedValue({ token: 'tok_123', username: 'testuser' });
	mockStoreCredentials.mockReturnValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── already-logged-in guard ───────────────────────────────────────────────────

describe('already logged in guard', () => {
	it('prints an error and exits when already logged in (no --force)', async () => {
		mockIsLoggedIn.mockReturnValue(true);

		const program = makeProgram();
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit called');
		});

		await expect(program.parseAsync(['node', 'coati', 'login'])).rejects.toThrow(
			'process.exit called'
		);

		expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Already logged in'));
		expect(exitSpy).toHaveBeenCalledWith(1);
		expect(mockRequestDeviceCode).not.toHaveBeenCalled();
	});

	it('proceeds when already logged in but --force is passed', async () => {
		mockIsLoggedIn.mockReturnValue(true);

		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'login', '--force']);

		expect(mockRequestDeviceCode).toHaveBeenCalled();
		expect(mockStoreCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
	});

	it('proceeds normally when not logged in', async () => {
		mockIsLoggedIn.mockReturnValue(false);

		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'login']);

		expect(mockRequestDeviceCode).toHaveBeenCalled();
		expect(mockStoreCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
	});
});

// ── --force flag ──────────────────────────────────────────────────────────────

describe('--force flag', () => {
	it('bypasses the already-logged-in check and completes login', async () => {
		mockIsLoggedIn.mockReturnValue(true);

		const program = makeProgram();
		await program.parseAsync(['node', 'coati', 'login', '--force']);

		expect(mockRequestDeviceCode).toHaveBeenCalledTimes(1);
		expect(mockPollForToken).toHaveBeenCalledWith('dc_test', 5, 900);
		expect(mockStoreCredentials).toHaveBeenCalledWith('tok_123', 'testuser');
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining('testuser'));
	});
});
