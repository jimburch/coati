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

	it('rejects top-level field constraints (name, version, description, files, license, category, minToolVersion)', () => {
		const cases: Array<[Partial<Manifest> & Record<string, unknown>, string]> = [
			[{ name: '' }, 'name'],
			[{ name: 'a'.repeat(101) }, 'name'],
			[{ name: 'My Setup!' }, 'name'],
			[{ version: 'v1.0' }, 'version'],
			[{ description: undefined } as Partial<Manifest>, 'description'],
			[{ description: 'x'.repeat(301) }, 'description'],
			[{ files: [] }, 'files'],
			[{ license: 'L'.repeat(51) }, 'license'],
			[{ minToolVersion: '1'.repeat(21) }, 'minToolVersion'],
			[{ category: 'robotics' }, 'category']
		];
		for (const [override, field] of cases) {
			const result = validateManifest({ ...VALID_MANIFEST, ...override });
			expect(result.valid, `expected invalid for field=${field}`).toBe(false);
			expect(
				result.errors.some((e) => e.field === field),
				`missing error for ${field}`
			).toBe(true);
		}
	});

	it('rejects invalid file entries (missing path, legacy source field, bad componentType)', () => {
		const cases: Array<[unknown[], string]> = [
			[[{}], 'files[0].path'],
			[[{ source: 'foo.md', target: '~/.foo', placement: 'global' }], 'files[0].path'],
			[[{ path: 'foo', componentType: 'widget' }], 'files[0].componentType']
		];
		for (const [files, field] of cases) {
			const result = validateManifest({ ...VALID_MANIFEST, files });
			expect(result.valid).toBe(false);
			expect(
				result.errors.some((e) => e.field === field),
				`missing error for ${field}`
			).toBe(true);
		}
	});

	it('accepts optional fields (componentType, category, legacy placement)', () => {
		expect(
			validateManifest({
				...VALID_MANIFEST,
				files: [{ path: 'foo', componentType: 'skill' }]
			}).valid
		).toBe(true);
		expect(validateManifest({ ...VALID_MANIFEST, category: 'devops' }).valid).toBe(true);
		expect(validateManifest({ ...VALID_MANIFEST, placement: 'global' }).valid).toBe(true);
		expect(validateManifest({ ...VALID_MANIFEST, placement: 'project' }).valid).toBe(true);
	});
});

describe('writeManifest + readManifest roundtrip', () => {
	it('writes and reads back a valid manifest', () => {
		writeManifest(tmpDir, VALID_MANIFEST);
		const read = readManifest(tmpDir);
		expect(read.name).toBe(VALID_MANIFEST.name);
		expect(read.version).toBe(VALID_MANIFEST.version);
		expect(read.description).toBe(VALID_MANIFEST.description);
		expect(read.files).toHaveLength(1);
		expect(read.files[0]!.path).toBe('claude/settings.json');
	});

	it('reads back a legacy manifest with placement field without error', () => {
		const legacyManifest = { ...VALID_MANIFEST, placement: 'global' };
		fs.writeFileSync(
			path.join(tmpDir, MANIFEST_FILENAME),
			JSON.stringify(legacyManifest, null, '\t') + '\n',
			'utf-8'
		);
		expect(() => readManifest(tmpDir)).not.toThrow();
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
	it('accepts optional source, clonedAt, and revision fields (individually and combined)', () => {
		expect(validateManifest({ ...VALID_MANIFEST, source: 'alice/my-setup' }).valid).toBe(true);
		expect(
			validateManifest({ ...VALID_MANIFEST, clonedAt: '2026-03-30T12:00:00.000Z' }).valid
		).toBe(true);
		expect(validateManifest({ ...VALID_MANIFEST, revision: '1.0.0' }).valid).toBe(true);
		expect(
			validateManifest({
				...VALID_MANIFEST,
				source: 'alice/my-setup',
				clonedAt: '2026-03-30T12:00:00.000Z',
				revision: '1.0.0'
			}).valid
		).toBe(true);
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
