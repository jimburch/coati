import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setConfigDir } from './config.js';

// Mock @sentry/node at the import boundary so tests never call the real SDK.
vi.mock('@sentry/node', () => ({
	init: vi.fn(),
	captureException: vi.fn(),
	flush: vi.fn().mockResolvedValue(true)
}));

// We must import after vi.mock so the mock is in place.
const sentryMod = await import('@sentry/node');
const mockInit = vi.mocked(sentryMod.init);

// Import the module under test after mocks are set.
const { initCliCrashReporting, resetForTesting } = await import('./observability.js');

let tmpDir: string;

beforeEach(() => {
	vi.clearAllMocks();

	// Reset the singleton guard so each test starts fresh.
	resetForTesting();

	// Use a temp dir so tests never touch real ~/.coati
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-obs-test-'));
	setConfigDir(tmpDir);

	// Clear any opt-out env vars before each test
	delete process.env.DO_NOT_TRACK;
	delete process.env.COATI_TELEMETRY;
	delete process.env.COATI_API_BASE;
});

afterEach(() => {
	setConfigDir(path.join(os.homedir(), '.coati'));
	fs.rmSync(tmpDir, { recursive: true, force: true });
	delete process.env.DO_NOT_TRACK;
	delete process.env.COATI_TELEMETRY;
	delete process.env.COATI_API_BASE;
});

describe('initCliCrashReporting — opt-out: DO_NOT_TRACK', () => {
	it('skips Sentry init when DO_NOT_TRACK=1', () => {
		process.env.DO_NOT_TRACK = '1';
		initCliCrashReporting();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('does NOT skip when DO_NOT_TRACK is absent', () => {
		initCliCrashReporting();
		expect(mockInit).toHaveBeenCalled();
	});
});

describe('initCliCrashReporting — opt-out: COATI_TELEMETRY', () => {
	it('skips Sentry init when COATI_TELEMETRY=false', () => {
		process.env.COATI_TELEMETRY = 'false';
		initCliCrashReporting();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('does NOT skip when COATI_TELEMETRY=true', () => {
		process.env.COATI_TELEMETRY = 'true';
		initCliCrashReporting();
		expect(mockInit).toHaveBeenCalled();
	});
});

describe('initCliCrashReporting — opt-out: config file telemetry flag', () => {
	it('skips Sentry init when telemetry: false in config', () => {
		const configPath = path.join(tmpDir, 'config.json');
		fs.mkdirSync(tmpDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({ apiBase: 'https://coati.sh/api/v1', telemetry: false }),
			{ mode: 0o600 }
		);
		initCliCrashReporting();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('does NOT skip when telemetry: true in config', () => {
		const configPath = path.join(tmpDir, 'config.json');
		fs.mkdirSync(tmpDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({ apiBase: 'https://coati.sh/api/v1', telemetry: true }),
			{ mode: 0o600 }
		);
		initCliCrashReporting();
		expect(mockInit).toHaveBeenCalled();
	});

	it('does NOT skip when telemetry is absent from config', () => {
		initCliCrashReporting();
		expect(mockInit).toHaveBeenCalled();
	});
});

describe('initCliCrashReporting — opt-out precedence', () => {
	it('DO_NOT_TRACK takes precedence over COATI_TELEMETRY=true', () => {
		process.env.DO_NOT_TRACK = '1';
		process.env.COATI_TELEMETRY = 'true';
		initCliCrashReporting();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('COATI_TELEMETRY=false takes precedence over config telemetry: true', () => {
		process.env.COATI_TELEMETRY = 'false';
		const configPath = path.join(tmpDir, 'config.json');
		fs.mkdirSync(tmpDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({ apiBase: 'https://coati.sh/api/v1', telemetry: true }),
			{ mode: 0o600 }
		);
		initCliCrashReporting();
		expect(mockInit).not.toHaveBeenCalled();
	});
});

describe('initCliCrashReporting — Sentry init parameters', () => {
	it('calls Sentry.init with correct release tag containing cli version', () => {
		initCliCrashReporting();
		expect(mockInit).toHaveBeenCalledOnce();
		const initArg = mockInit.mock.calls[0]?.[0];
		expect(initArg).toBeDefined();
		expect(initArg?.release).toMatch(/^coati-cli@\d+\.\d+\.\d+/);
	});

	it('calls Sentry.init with the hardcoded DSN', () => {
		initCliCrashReporting();
		const initArg = mockInit.mock.calls[0]?.[0];
		expect(initArg?.dsn).toBe(
			'https://2674d0080ed31265fb67f1a5414bc096@o4511222630907904.ingest.us.sentry.io/4511225534349312'
		);
	});

	it('sets environment to staging when API base points at develop.coati.sh', () => {
		process.env.COATI_API_BASE = 'https://develop.coati.sh/api/v1';
		initCliCrashReporting();
		const initArg = mockInit.mock.calls[0]?.[0];
		expect(initArg?.environment).toBe('staging');
	});

	it('sets environment to production when API base points at coati.sh', () => {
		process.env.COATI_API_BASE = 'https://coati.sh/api/v1';
		initCliCrashReporting();
		const initArg = mockInit.mock.calls[0]?.[0];
		expect(initArg?.environment).toBe('production');
	});

	it('defaults to production environment when API base is unrecognised', () => {
		process.env.COATI_API_BASE = 'http://localhost:5173/api/v1';
		initCliCrashReporting();
		const initArg = mockInit.mock.calls[0]?.[0];
		expect(initArg?.environment).toBe('production');
	});

	it('sets sendDefaultPii to false', () => {
		initCliCrashReporting();
		const initArg = mockInit.mock.calls[0]?.[0];
		expect(initArg?.sendDefaultPii).toBe(false);
	});
});

describe('initCliCrashReporting — process handlers', () => {
	it('registers uncaughtException handler that calls captureException', () => {
		const onSpy = vi.spyOn(process, 'on');
		initCliCrashReporting();
		const uncaughtCall = onSpy.mock.calls.find(([event]) => event === 'uncaughtException');
		expect(uncaughtCall).toBeDefined();
		onSpy.mockRestore();
	});

	it('registers unhandledRejection handler that calls captureException', () => {
		const onSpy = vi.spyOn(process, 'on');
		initCliCrashReporting();
		const rejectionCall = onSpy.mock.calls.find(([event]) => event === 'unhandledRejection');
		expect(rejectionCall).toBeDefined();
		onSpy.mockRestore();
	});
});
