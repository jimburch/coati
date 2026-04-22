import { describe, expect, it } from 'vitest';
import {
	manifestCategorySchema,
	manifestFileComponentTypeSchema,
	manifestFileEntrySchema,
	manifestFilePlacementSchema,
	manifestSchema,
	zodPathToField
} from './validation.js';

const VALID_FILE = {
	path: 'claude/settings.json'
};

const VALID_MANIFEST = {
	name: 'my-setup',
	version: '1.0.0',
	description: 'A test setup',
	files: [VALID_FILE]
};

describe('zodPathToField', () => {
	it('builds a field descriptor from zod path segments (dot for strings, brackets for numbers)', () => {
		expect(zodPathToField([])).toBe('');
		expect(zodPathToField(['name'])).toBe('name');
		expect(zodPathToField(['a', 'b', 'c'])).toBe('a.b.c');
		expect(zodPathToField(['files', 0, 'path'])).toBe('files[0].path');
		expect(zodPathToField(['matrix', 1, 2])).toBe('matrix[1][2]');
	});
});

describe('enum schemas (placement, componentType, category)', () => {
	it('accept their full value set and reject unknowns', () => {
		for (const v of ['global', 'project']) {
			expect(manifestFilePlacementSchema.safeParse(v).success).toBe(true);
		}
		for (const v of ['relative', 'nowhere']) {
			expect(manifestFilePlacementSchema.safeParse(v).success).toBe(false);
		}

		for (const v of [
			'instruction',
			'command',
			'skill',
			'mcp_server',
			'hook',
			'config',
			'policy',
			'agent_def',
			'ignore',
			'setup_script'
		]) {
			expect(manifestFileComponentTypeSchema.safeParse(v).success).toBe(true);
		}
		expect(manifestFileComponentTypeSchema.safeParse('widget').success).toBe(false);

		for (const v of ['web-dev', 'mobile', 'data-science', 'devops', 'systems', 'general']) {
			expect(manifestCategorySchema.safeParse(v).success).toBe(true);
		}
		expect(manifestCategorySchema.safeParse('robotics').success).toBe(false);
	});
});

describe('manifestFileEntrySchema', () => {
	it('accepts valid entries (with/without optional componentType, description, agent)', () => {
		expect(manifestFileEntrySchema.safeParse(VALID_FILE).success).toBe(true);
		expect(
			manifestFileEntrySchema.safeParse({ ...VALID_FILE, componentType: 'skill' }).success
		).toBe(true);
		expect(
			manifestFileEntrySchema.safeParse({ ...VALID_FILE, description: 'My file' }).success
		).toBe(true);
		expect(manifestFileEntrySchema.safeParse({ ...VALID_FILE, agent: 'claude-code' }).success).toBe(
			true
		);

		const noAgent = manifestFileEntrySchema.safeParse(VALID_FILE);
		expect(noAgent.success).toBe(true);
		if (noAgent.success) expect(noAgent.data.agent).toBeUndefined();
	});

	it('rejects missing/empty path, legacy source field, and invalid componentType', () => {
		const missing = manifestFileEntrySchema.safeParse({});
		expect(missing.success).toBe(false);
		if (!missing.success) {
			expect(missing.error.issues.some((i) => i.path.includes('path'))).toBe(true);
		}

		expect(manifestFileEntrySchema.safeParse({ path: '' }).success).toBe(false);

		const legacy = manifestFileEntrySchema.safeParse({
			source: 'foo.md',
			target: '~/.foo',
			placement: 'global'
		});
		expect(legacy.success).toBe(false);
		if (!legacy.success) {
			expect(legacy.error.issues.some((i) => i.path.includes('path'))).toBe(true);
		}

		expect(
			manifestFileEntrySchema.safeParse({ ...VALID_FILE, componentType: 'widget' }).success
		).toBe(false);
	});
});

describe('manifestSchema', () => {
	it('accepts minimal and fully-populated manifests', () => {
		expect(manifestSchema.safeParse(VALID_MANIFEST).success).toBe(true);
		expect(
			manifestSchema.safeParse({
				...VALID_MANIFEST,
				category: 'devops',
				license: 'MIT',
				minToolVersion: '1.0',
				postInstall: ['chmod +x script.sh'],
				prerequisites: ['node >= 18'],
				agents: ['claude-code'],
				tags: ['typescript', 'mcp']
			}).success
		).toBe(true);
	});

	it('silently drops a legacy `readme` field instead of failing validation', () => {
		const result = manifestSchema.safeParse({
			...VALID_MANIFEST,
			readme: 'README.md'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect('readme' in result.data).toBe(false);
		}
	});

	it('handles the display field: optional, trimmed, max 150 chars', () => {
		expect(manifestSchema.safeParse(VALID_MANIFEST).success).toBe(true);
		expect(
			manifestSchema.safeParse({ ...VALID_MANIFEST, display: 'My Awesome Setup' }).success
		).toBe(true);
		expect(manifestSchema.safeParse({ ...VALID_MANIFEST, display: 'a'.repeat(150) }).success).toBe(
			true
		);
		// trim-before-check: 150 'a's surrounded by spaces still passes
		expect(
			manifestSchema.safeParse({ ...VALID_MANIFEST, display: '  ' + 'a'.repeat(150) + '  ' })
				.success
		).toBe(true);

		const tooLong = manifestSchema.safeParse({ ...VALID_MANIFEST, display: 'a'.repeat(151) });
		expect(tooLong.success).toBe(false);
		if (!tooLong.success) {
			expect(tooLong.error.issues.some((i) => i.path[0] === 'display')).toBe(true);
		}
	});

	it('accepts file entries with/without agent and any valid componentType', () => {
		expect(
			manifestSchema.safeParse({
				...VALID_MANIFEST,
				files: [{ ...VALID_FILE, agent: 'cursor' }]
			}).success
		).toBe(true);

		for (const ct of ['config', 'policy', 'agent_def', 'ignore', 'setup_script']) {
			const result = manifestSchema.safeParse({
				...VALID_MANIFEST,
				files: [{ ...VALID_FILE, componentType: ct }]
			});
			expect(result.success, `componentType "${ct}" should be accepted`).toBe(true);
		}
	});

	it('silently strips the legacy placement field (any value)', () => {
		for (const placement of ['global', 'relative', undefined]) {
			const input = placement === undefined ? VALID_MANIFEST : { ...VALID_MANIFEST, placement };
			expect(manifestSchema.safeParse(input).success).toBe(true);
		}
	});

	it('rejects null and malformed top-level fields with the right error paths', () => {
		expect(manifestSchema.safeParse(null).success).toBe(false);

		const missingName = manifestSchema.safeParse({
			version: VALID_MANIFEST.version,
			description: VALID_MANIFEST.description,
			files: VALID_MANIFEST.files
		});
		expect(missingName.success).toBe(false);
		if (!missingName.success) {
			expect(missingName.error.issues.some((i) => i.path[0] === 'name')).toBe(true);
		}

		const badName = manifestSchema.safeParse({ ...VALID_MANIFEST, name: 'My Setup!' });
		expect(badName.success).toBe(false);
		if (!badName.success) {
			expect(badName.error.issues.some((i) => i.path[0] === 'name')).toBe(true);
		}

		expect(manifestSchema.safeParse({ ...VALID_MANIFEST, name: 'a'.repeat(101) }).success).toBe(
			false
		);

		const badVersion = manifestSchema.safeParse({ ...VALID_MANIFEST, version: 'v1.0' });
		expect(badVersion.success).toBe(false);
		if (!badVersion.success) {
			expect(badVersion.error.issues.some((i) => i.path[0] === 'version')).toBe(true);
		}

		const badDesc = manifestSchema.safeParse({ ...VALID_MANIFEST, description: 'x'.repeat(301) });
		expect(badDesc.success).toBe(false);
		if (!badDesc.success) {
			expect(badDesc.error.issues.some((i) => i.path[0] === 'description')).toBe(true);
		}

		const emptyFiles = manifestSchema.safeParse({ ...VALID_MANIFEST, files: [] });
		expect(emptyFiles.success).toBe(false);
		if (!emptyFiles.success) {
			expect(emptyFiles.error.issues.some((i) => i.path[0] === 'files')).toBe(true);
		}

		const missingFilePath = manifestSchema.safeParse({
			...VALID_MANIFEST,
			files: [{ componentType: 'skill' }]
		});
		expect(missingFilePath.success).toBe(false);
		if (!missingFilePath.success) {
			const paths = missingFilePath.error.issues.map((i) => i.path);
			expect(paths.some((p) => p[0] === 'files' && p[1] === 0 && p[2] === 'path')).toBe(true);
		}

		expect(manifestSchema.safeParse({ ...VALID_MANIFEST, category: 'robotics' }).success).toBe(
			false
		);
		expect(manifestSchema.safeParse({ ...VALID_MANIFEST, license: 'L'.repeat(51) }).success).toBe(
			false
		);
		expect(
			manifestSchema.safeParse({ ...VALID_MANIFEST, minToolVersion: '1'.repeat(21) }).success
		).toBe(false);
	});
});
