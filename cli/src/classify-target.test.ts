import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { classifyTarget } from './classify-target.js';

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-classify-test-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('classifyTarget — absent', () => {
	it('returns absent when target path does not exist', () => {
		const result = classifyTarget(path.join(tmpDir, 'nope.md'), '# Hello');
		expect(result.kind).toBe('absent');
	});
});

describe('classifyTarget — identical', () => {
	it('returns identical when on-disk bytes match incoming content exactly', () => {
		const target = path.join(tmpDir, 'same.md');
		fs.writeFileSync(target, '# Hello', 'utf-8');

		const result = classifyTarget(target, '# Hello');
		expect(result.kind).toBe('identical');
	});
});

describe('classifyTarget — different', () => {
	it('returns different when contents differ but sizes are equal', () => {
		const target = path.join(tmpDir, 'diff.md');
		fs.writeFileSync(target, '# Hello', 'utf-8');

		const result = classifyTarget(target, '# World'); // same byte length, different content
		expect(result.kind).toBe('different');
	});

	it('returns different when sizes differ (stat-size short-circuit)', () => {
		const target = path.join(tmpDir, 'diff-size.md');
		fs.writeFileSync(target, 'short', 'utf-8');

		const result = classifyTarget(target, 'much longer content');
		expect(result.kind).toBe('different');
	});

	it('treats CRLF vs LF as different (no normalization)', () => {
		const target = path.join(tmpDir, 'crlf.md');
		fs.writeFileSync(target, 'line1\r\nline2\r\n', 'utf-8');

		const result = classifyTarget(target, 'line1\nline2\n');
		expect(result.kind).toBe('different');
	});

	it('treats trailing-newline difference as different', () => {
		const target = path.join(tmpDir, 'nl.md');
		fs.writeFileSync(target, 'content\n', 'utf-8');

		const result = classifyTarget(target, 'content');
		expect(result.kind).toBe('different');
	});

	it('treats UTF-8 BOM as a difference', () => {
		const target = path.join(tmpDir, 'bom.md');
		fs.writeFileSync(target, '\uFEFFhello', 'utf-8');

		const result = classifyTarget(target, 'hello');
		expect(result.kind).toBe('different');
	});
});

describe('classifyTarget — is-directory', () => {
	it('returns is-directory when target path is a directory', () => {
		const target = path.join(tmpDir, 'a-dir');
		fs.mkdirSync(target);

		const result = classifyTarget(target, 'anything');
		expect(result.kind).toBe('is-directory');
	});
});

describe('classifyTarget — unreadable', () => {
	it('returns unreadable when target is a broken symlink', () => {
		const link = path.join(tmpDir, 'broken-link');
		fs.symlinkSync(path.join(tmpDir, 'does-not-exist'), link);

		const result = classifyTarget(link, 'x');
		expect(result.kind).toBe('unreadable');
		if (result.kind === 'unreadable') {
			expect(result.reason).toBeInstanceOf(Error);
		}
	});
});
