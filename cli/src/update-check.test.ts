import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkForUpdate, formatUpdateNotice } from './update-check.js';

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-update-test-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
	vi.restoreAllMocks();
});

describe('formatUpdateNotice', () => {
	it('produces a notice with current and latest versions and install command', () => {
		const notice = formatUpdateNotice('0.3.0', '0.5.0');
		expect(notice).toContain('0.3.0');
		expect(notice).toContain('0.5.0');
		expect(notice).toContain('npm install -g @coati/sh@latest');
	});
});

describe('checkForUpdate', () => {
	it('returns null when current version matches latest', async () => {
		const cacheFile = path.join(tmpDir, 'update-check.json');
		fs.writeFileSync(cacheFile, JSON.stringify({ lastCheck: Date.now(), latestVersion: '0.3.0' }));

		const result = await checkForUpdate('0.3.0', { cacheDir: tmpDir });
		expect(result).toBeNull();
	});

	it('fetches from npm when cache is missing and writes cache', async () => {
		// No cache file exists
		const fetchFn = vi.fn().mockResolvedValue('0.5.0');
		const result = await checkForUpdate('0.3.0', { cacheDir: tmpDir, fetchLatestVersion: fetchFn });

		expect(fetchFn).toHaveBeenCalledOnce();
		expect(result).toEqual({ currentVersion: '0.3.0', latestVersion: '0.5.0' });

		// Cache should have been written
		const cache = JSON.parse(fs.readFileSync(path.join(tmpDir, 'update-check.json'), 'utf-8'));
		expect(cache.latestVersion).toBe('0.5.0');
		expect(cache.lastCheck).toBeTypeOf('number');
	});

	it('fetches from npm when cache is stale (older than 24h)', async () => {
		const cacheFile = path.join(tmpDir, 'update-check.json');
		const staleTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
		fs.writeFileSync(
			cacheFile,
			JSON.stringify({ lastCheck: staleTimestamp, latestVersion: '0.4.0' })
		);

		const fetchFn = vi.fn().mockResolvedValue('0.5.0');
		const result = await checkForUpdate('0.3.0', { cacheDir: tmpDir, fetchLatestVersion: fetchFn });

		expect(fetchFn).toHaveBeenCalledOnce();
		expect(result).toEqual({ currentVersion: '0.3.0', latestVersion: '0.5.0' });
	});

	it('returns null on network error (non-blocking)', async () => {
		// No cache, fetch throws
		const fetchFn = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));
		const result = await checkForUpdate('0.3.0', { cacheDir: tmpDir, fetchLatestVersion: fetchFn });
		expect(result).toBeNull();
	});

	it('uses cached result when cache is fresh (does not fetch)', async () => {
		const cacheFile = path.join(tmpDir, 'update-check.json');
		fs.writeFileSync(cacheFile, JSON.stringify({ lastCheck: Date.now(), latestVersion: '0.5.0' }));

		const fetchFn = vi.fn();
		const result = await checkForUpdate('0.3.0', { cacheDir: tmpDir, fetchLatestVersion: fetchFn });
		expect(fetchFn).not.toHaveBeenCalled();
		expect(result).toEqual({ currentVersion: '0.3.0', latestVersion: '0.5.0' });
	});

	it('returns update info when a newer version is available', async () => {
		const cacheFile = path.join(tmpDir, 'update-check.json');
		fs.writeFileSync(cacheFile, JSON.stringify({ lastCheck: Date.now(), latestVersion: '0.4.0' }));

		const result = await checkForUpdate('0.3.0', { cacheDir: tmpDir });
		expect(result).toEqual({ currentVersion: '0.3.0', latestVersion: '0.4.0' });
	});
});
