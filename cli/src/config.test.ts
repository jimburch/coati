import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearConfig, getConfig, setConfig, setConfigDir } from './config.js';

let tmpDir: string;

beforeEach(() => {
	// Create a fresh temp directory for each test so tests never touch ~/.coati
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-config-test-'));
	setConfigDir(tmpDir);
});

afterEach(() => {
	// Restore to real home dir and clean up temp directory
	setConfigDir(path.join(os.homedir(), '.coati'));
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('getConfig', () => {
	it('returns default config when no file exists', () => {
		const config = getConfig();
		expect(config).toEqual({ apiBase: 'https://coati.sh/api/v1' });
		expect(config.token).toBeUndefined();
		expect(config.username).toBeUndefined();
	});
});

describe('setConfig + getConfig roundtrip', () => {
	it('writes and reads back the full config', () => {
		setConfig({ token: 'abc123', username: 'alice' });
		const config = getConfig();
		expect(config.token).toBe('abc123');
		expect(config.username).toBe('alice');
		expect(config.apiBase).toBe('https://coati.sh/api/v1');
	});

	it('creates the config directory if it does not exist', () => {
		const nested = path.join(tmpDir, 'nested', 'dir');
		setConfigDir(nested);
		setConfig({ token: 'tok' });
		expect(fs.existsSync(nested)).toBe(true);
	});
});

describe('partial update', () => {
	it('merges partial config without overwriting unrelated fields', () => {
		setConfig({ token: 'first-token', username: 'bob' });
		setConfig({ token: 'new-token' });
		const config = getConfig();
		expect(config.token).toBe('new-token');
		expect(config.username).toBe('bob');
		expect(config.apiBase).toBe('https://coati.sh/api/v1');
	});

	it('can override apiBase', () => {
		setConfig({ apiBase: 'http://localhost:5173/api/v1' });
		expect(getConfig().apiBase).toBe('http://localhost:5173/api/v1');
	});
});

describe('clearConfig', () => {
	it('removes the config file', () => {
		setConfig({ token: 'to-delete' });
		const filePath = path.join(tmpDir, 'config.json');
		expect(fs.existsSync(filePath)).toBe(true);

		clearConfig();
		expect(fs.existsSync(filePath)).toBe(false);
	});

	it('does nothing when no config file exists', () => {
		// Should not throw
		expect(() => clearConfig()).not.toThrow();
	});

	it('returns defaults after clearing', () => {
		setConfig({ token: 'tok', username: 'carol' });
		clearConfig();
		const config = getConfig();
		expect(config).toEqual({ apiBase: 'https://coati.sh/api/v1' });
	});
});

describe('file permissions', () => {
	it('creates config file with 0o600 permissions', () => {
		setConfig({ token: 'secret' });
		const filePath = path.join(tmpDir, 'config.json');
		const stat = fs.statSync(filePath);
		// Extract the permission bits (mask off file type bits)
		const mode = stat.mode & 0o777;
		expect(mode).toBe(0o600);
	});
});
