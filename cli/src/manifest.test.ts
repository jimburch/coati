import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	MANIFEST_FILENAME,
	readManifest,
	validateManifest,
	writeManifest,
	type Manifest
} from './manifest.js';

const VALID_MANIFEST: Manifest = {
	name: 'my-setup',
	version: '1.0.0',
	description: 'A test setup',
	placement: 'global',
	files: [
		{
			path: 'claude/settings.json'
		}
	]
};

let tmpDir: string;

beforeEach(() => {
	tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coati-manifest-test-'));
});

afterEach(() => {
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('validateManifest', () => {
	it('accepts a valid manifest', () => {
		const result = validateManifest(VALID_MANIFEST);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('rejects non-objects', () => {
		expect(validateManifest(null).valid).toBe(false);
		expect(validateManifest('string').valid).toBe(false);
		expect(validateManifest(42).valid).toBe(false);
	});

	it('requires name', () => {
		const result = validateManifest({ ...VALID_MANIFEST, name: '' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'name')).toBe(true);
	});

	it('rejects name exceeding 100 chars', () => {
		const result = validateManifest({ ...VALID_MANIFEST, name: 'a'.repeat(101) });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'name')).toBe(true);
	});

	it('rejects name with invalid slug format', () => {
		const result = validateManifest({ ...VALID_MANIFEST, name: 'My Setup!' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'name')).toBe(true);
	});

	it('requires version in semver format', () => {
		const result = validateManifest({ ...VALID_MANIFEST, version: 'v1.0' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'version')).toBe(true);
	});

	it('requires description', () => {
		const result = validateManifest({ ...VALID_MANIFEST, description: undefined });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'description')).toBe(true);
	});

	it('rejects description exceeding 300 chars', () => {
		const result = validateManifest({ ...VALID_MANIFEST, description: 'x'.repeat(301) });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'description')).toBe(true);
	});

	it('requires placement', () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { placement: _placement, ...withoutPlacement } = VALID_MANIFEST;
		const result = validateManifest(withoutPlacement);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'placement')).toBe(true);
	});

	it('accepts global placement', () => {
		const result = validateManifest({ ...VALID_MANIFEST, placement: 'global' });
		expect(result.valid).toBe(true);
	});

	it('accepts project placement', () => {
		const result = validateManifest({ ...VALID_MANIFEST, placement: 'project' });
		expect(result.valid).toBe(true);
	});

	it('rejects relative placement', () => {
		const result = validateManifest({ ...VALID_MANIFEST, placement: 'relative' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'placement')).toBe(true);
	});

	it('rejects unknown placement', () => {
		const result = validateManifest({ ...VALID_MANIFEST, placement: 'nowhere' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'placement')).toBe(true);
	});

	it('requires at least one file', () => {
		const result = validateManifest({ ...VALID_MANIFEST, files: [] });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'files')).toBe(true);
	});

	it('rejects file entry missing path', () => {
		const result = validateManifest({
			...VALID_MANIFEST,
			files: [{}]
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'files[0].path')).toBe(true);
	});

	it('rejects file entry with old source field (no path)', () => {
		const result = validateManifest({
			...VALID_MANIFEST,
			files: [{ source: 'foo.md', target: '~/.foo', placement: 'global' }]
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'files[0].path')).toBe(true);
	});

	it('rejects file entry with invalid componentType', () => {
		const result = validateManifest({
			...VALID_MANIFEST,
			files: [{ path: 'foo', componentType: 'widget' }]
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'files[0].componentType')).toBe(true);
	});

	it('accepts a valid componentType', () => {
		const result = validateManifest({
			...VALID_MANIFEST,
			files: [{ path: 'foo', componentType: 'skill' }]
		});
		expect(result.valid).toBe(true);
	});

	it('rejects unknown category', () => {
		const result = validateManifest({ ...VALID_MANIFEST, category: 'robotics' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'category')).toBe(true);
	});

	it('accepts known category', () => {
		const result = validateManifest({ ...VALID_MANIFEST, category: 'devops' });
		expect(result.valid).toBe(true);
	});

	it('rejects license exceeding 50 chars', () => {
		const result = validateManifest({ ...VALID_MANIFEST, license: 'L'.repeat(51) });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'license')).toBe(true);
	});

	it('rejects minToolVersion exceeding 20 chars', () => {
		const result = validateManifest({ ...VALID_MANIFEST, minToolVersion: '1'.repeat(21) });
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.field === 'minToolVersion')).toBe(true);
	});
});

describe('writeManifest + readManifest roundtrip', () => {
	it('writes and reads back a valid manifest', () => {
		writeManifest(tmpDir, VALID_MANIFEST);
		const read = readManifest(tmpDir);
		expect(read.name).toBe(VALID_MANIFEST.name);
		expect(read.version).toBe(VALID_MANIFEST.version);
		expect(read.description).toBe(VALID_MANIFEST.description);
		expect(read.placement).toBe('global');
		expect(read.files).toHaveLength(1);
		expect(read.files[0]!.path).toBe('claude/settings.json');
	});

	it('creates the directory if it does not exist', () => {
		const nested = path.join(tmpDir, 'nested', 'dir');
		writeManifest(nested, VALID_MANIFEST);
		expect(fs.existsSync(path.join(nested, MANIFEST_FILENAME))).toBe(true);
	});

	it('writes valid JSON to coati.json', () => {
		writeManifest(tmpDir, VALID_MANIFEST);
		const raw = fs.readFileSync(path.join(tmpDir, MANIFEST_FILENAME), 'utf-8');
		expect(() => JSON.parse(raw)).not.toThrow();
	});

	it('preserves optional fields through the roundtrip', () => {
		const withOptionals: Manifest = {
			...VALID_MANIFEST,
			category: 'devops',
			license: 'MIT',
			tags: ['typescript', 'mcp'],
			agents: ['claude-code'],
			postInstall: ['chmod +x script.sh'],
			readme: 'README.md'
		};
		writeManifest(tmpDir, withOptionals);
		const read = readManifest(tmpDir);
		expect(read.category).toBe('devops');
		expect(read.license).toBe('MIT');
		expect(read.tags).toEqual(['typescript', 'mcp']);
		expect(read.agents).toEqual(['claude-code']);
		expect(read.postInstall).toEqual(['chmod +x script.sh']);
	});

	it('preserves agent field on file entries through the roundtrip', () => {
		const withAgent: Manifest = {
			...VALID_MANIFEST,
			files: [
				{
					path: 'claude/settings.json',
					agent: 'claude-code'
				}
			]
		};
		writeManifest(tmpDir, withAgent);
		const read = readManifest(tmpDir);
		expect(read.files[0]!.agent).toBe('claude-code');
	});

	it('accepts undefined agent on file entries (agent-agnostic)', () => {
		writeManifest(tmpDir, VALID_MANIFEST);
		const read = readManifest(tmpDir);
		expect(read.files[0]!.agent).toBeUndefined();
	});
});

describe('validateManifest — clone-tracking fields', () => {
	it('accepts optional source field', () => {
		const result = validateManifest({ ...VALID_MANIFEST, source: 'alice/my-setup' });
		expect(result.valid).toBe(true);
	});

	it('accepts optional clonedAt field', () => {
		const result = validateManifest({ ...VALID_MANIFEST, clonedAt: '2026-03-30T12:00:00.000Z' });
		expect(result.valid).toBe(true);
	});

	it('accepts optional revision field', () => {
		const result = validateManifest({ ...VALID_MANIFEST, revision: '1.0.0' });
		expect(result.valid).toBe(true);
	});

	it('accepts all three tracking fields together', () => {
		const result = validateManifest({
			...VALID_MANIFEST,
			source: 'alice/my-setup',
			clonedAt: '2026-03-30T12:00:00.000Z',
			revision: '1.0.0'
		});
		expect(result.valid).toBe(true);
	});

	it('preserves tracking fields through writeManifest/readManifest roundtrip', () => {
		const withTracking: Manifest = {
			...VALID_MANIFEST,
			source: 'alice/my-setup',
			clonedAt: '2026-03-30T12:00:00.000Z',
			revision: '1.0.0'
		};
		writeManifest(tmpDir, withTracking);
		const read = readManifest(tmpDir);
		expect(read.source).toBe('alice/my-setup');
		expect(read.clonedAt).toBe('2026-03-30T12:00:00.000Z');
		expect(read.revision).toBe('1.0.0');
	});
});

describe('readManifest error handling', () => {
	it('throws when coati.json does not exist', () => {
		expect(() => readManifest(tmpDir)).toThrow(/No coati\.json found/);
	});

	it('throws on malformed JSON', () => {
		fs.writeFileSync(path.join(tmpDir, MANIFEST_FILENAME), '{ invalid json }', 'utf-8');
		expect(() => readManifest(tmpDir)).toThrow(/not valid JSON/);
	});

	it('throws on invalid manifest contents', () => {
		fs.writeFileSync(path.join(tmpDir, MANIFEST_FILENAME), JSON.stringify({ name: 123 }), 'utf-8');
		expect(() => readManifest(tmpDir)).toThrow(/Invalid coati\.json/);
	});

	it('prints migration message and exits when setup.json exists but coati.json does not', () => {
		fs.writeFileSync(path.join(tmpDir, 'setup.json'), JSON.stringify(VALID_MANIFEST), 'utf-8');
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
			throw new Error('process.exit');
		});
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

		expect(() => readManifest(tmpDir)).toThrow('process.exit');
		expect(logSpy).toHaveBeenCalledWith(
			'ℹ Found setup.json — Coati now uses coati.json. Rename it to continue.'
		);
		expect(exitSpy).toHaveBeenCalledWith(1);

		exitSpy.mockRestore();
		logSpy.mockRestore();
	});
});
