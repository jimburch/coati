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

// ─── zodPathToField ───────────────────────────────────────────────────────────

describe('zodPathToField', () => {
	it('returns empty string for empty path', () => {
		expect(zodPathToField([])).toBe('');
	});

	it('returns simple field name for single string segment', () => {
		expect(zodPathToField(['name'])).toBe('name');
	});

	it('uses dot notation for nested string segments', () => {
		expect(zodPathToField(['a', 'b', 'c'])).toBe('a.b.c');
	});

	it('uses bracket notation for numeric segments', () => {
		expect(zodPathToField(['files', 0, 'path'])).toBe('files[0].path');
	});

	it('handles multiple numeric segments', () => {
		expect(zodPathToField(['matrix', 1, 2])).toBe('matrix[1][2]');
	});
});

// ─── manifestFilePlacementSchema ──────────────────────────────────────────────

describe('manifestFilePlacementSchema', () => {
	it.each(['global', 'project'])('accepts "%s"', (value) => {
		expect(manifestFilePlacementSchema.safeParse(value).success).toBe(true);
	});

	it('rejects "relative"', () => {
		expect(manifestFilePlacementSchema.safeParse('relative').success).toBe(false);
	});

	it('rejects unknown placement', () => {
		expect(manifestFilePlacementSchema.safeParse('nowhere').success).toBe(false);
	});
});

// ─── manifestFileComponentTypeSchema ─────────────────────────────────────────

describe('manifestFileComponentTypeSchema', () => {
	it.each([
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
	])('accepts "%s"', (value) => {
		expect(manifestFileComponentTypeSchema.safeParse(value).success).toBe(true);
	});

	it('rejects unknown componentType', () => {
		expect(manifestFileComponentTypeSchema.safeParse('widget').success).toBe(false);
	});
});

// ─── manifestCategorySchema ───────────────────────────────────────────────────

describe('manifestCategorySchema', () => {
	it.each(['web-dev', 'mobile', 'data-science', 'devops', 'systems', 'general'])(
		'accepts "%s"',
		(value) => {
			expect(manifestCategorySchema.safeParse(value).success).toBe(true);
		}
	);

	it('rejects unknown category', () => {
		expect(manifestCategorySchema.safeParse('robotics').success).toBe(false);
	});
});

// ─── manifestFileEntrySchema ──────────────────────────────────────────────────

describe('manifestFileEntrySchema', () => {
	it('accepts a valid file entry with path', () => {
		expect(manifestFileEntrySchema.safeParse(VALID_FILE).success).toBe(true);
	});

	it('accepts optional componentType', () => {
		const result = manifestFileEntrySchema.safeParse({ ...VALID_FILE, componentType: 'skill' });
		expect(result.success).toBe(true);
	});

	it('accepts optional description', () => {
		const result = manifestFileEntrySchema.safeParse({
			...VALID_FILE,
			description: 'My file'
		});
		expect(result.success).toBe(true);
	});

	it('accepts optional agent field', () => {
		const result = manifestFileEntrySchema.safeParse({ ...VALID_FILE, agent: 'claude-code' });
		expect(result.success).toBe(true);
	});

	it('accepts file entry without agent field (agent-agnostic)', () => {
		const result = manifestFileEntrySchema.safeParse(VALID_FILE);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.agent).toBeUndefined();
		}
	});

	it('rejects missing path', () => {
		const result = manifestFileEntrySchema.safeParse({});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes('path'))).toBe(true);
		}
	});

	it('rejects empty path', () => {
		const result = manifestFileEntrySchema.safeParse({ path: '' });
		expect(result.success).toBe(false);
	});

	it('rejects old source field without path', () => {
		const result = manifestFileEntrySchema.safeParse({
			source: 'foo.md',
			target: '~/.foo',
			placement: 'global'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes('path'))).toBe(true);
		}
	});

	it('rejects invalid componentType', () => {
		const result = manifestFileEntrySchema.safeParse({
			...VALID_FILE,
			componentType: 'widget'
		});
		expect(result.success).toBe(false);
	});
});

// ─── manifestSchema ───────────────────────────────────────────────────────────

describe('manifestSchema', () => {
	it('accepts a minimal valid manifest', () => {
		expect(manifestSchema.safeParse(VALID_MANIFEST).success).toBe(true);
	});

	it('accepts a manifest with all optional fields', () => {
		const full = {
			...VALID_MANIFEST,
			category: 'devops',
			license: 'MIT',
			minToolVersion: '1.0',
			postInstall: ['chmod +x script.sh'],
			prerequisites: ['node >= 18'],
			readme: 'README.md',
			agents: ['claude-code'],
			tags: ['typescript', 'mcp']
		};
		expect(manifestSchema.safeParse(full).success).toBe(true);
	});

	it('accepts file entries with agent field', () => {
		const result = manifestSchema.safeParse({
			...VALID_MANIFEST,
			files: [{ ...VALID_FILE, agent: 'cursor' }]
		});
		expect(result.success).toBe(true);
	});

	it('accepts file entries without agent field (agent-agnostic)', () => {
		const result = manifestSchema.safeParse(VALID_MANIFEST);
		expect(result.success).toBe(true);
	});

	it('accepts all expanded componentType values on file entries', () => {
		const newTypes = ['config', 'policy', 'agent_def', 'ignore', 'setup_script'];
		for (const ct of newTypes) {
			const result = manifestSchema.safeParse({
				...VALID_MANIFEST,
				files: [{ ...VALID_FILE, componentType: ct }]
			});
			expect(result.success, `Expected componentType "${ct}" to be accepted`).toBe(true);
		}
	});

	it('accepts manifest without placement field', () => {
		const result = manifestSchema.safeParse(VALID_MANIFEST);
		expect(result.success).toBe(true);
	});

	it('accepts manifest with legacy placement field (field is stripped)', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, placement: 'global' });
		expect(result.success).toBe(true);
	});

	it('accepts manifest with any placement value (field is not validated)', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, placement: 'relative' });
		expect(result.success).toBe(true);
	});

	it('rejects null', () => {
		expect(manifestSchema.safeParse(null).success).toBe(false);
	});

	it('rejects missing name', () => {
		const result = manifestSchema.safeParse({
			version: VALID_MANIFEST.version,
			description: VALID_MANIFEST.description,
			files: VALID_MANIFEST.files
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === 'name')).toBe(true);
		}
	});

	it('rejects name with invalid slug format', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, name: 'My Setup!' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === 'name')).toBe(true);
		}
	});

	it('rejects name exceeding 100 chars', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, name: 'a'.repeat(101) });
		expect(result.success).toBe(false);
	});

	it('rejects version without semver format', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, version: 'v1.0' });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === 'version')).toBe(true);
		}
	});

	it('rejects description exceeding 300 chars', () => {
		const result = manifestSchema.safeParse({
			...VALID_MANIFEST,
			description: 'x'.repeat(301)
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === 'description')).toBe(true);
		}
	});

	it('rejects empty files array', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, files: [] });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === 'files')).toBe(true);
		}
	});

	it('rejects file with missing path producing path files[0].path', () => {
		const result = manifestSchema.safeParse({
			...VALID_MANIFEST,
			files: [{ componentType: 'skill' }]
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const paths = result.error.issues.map((i) => i.path);
			expect(paths.some((p) => p[0] === 'files' && p[1] === 0 && p[2] === 'path')).toBe(true);
		}
	});

	it('rejects unknown category', () => {
		const result = manifestSchema.safeParse({ ...VALID_MANIFEST, category: 'robotics' });
		expect(result.success).toBe(false);
	});

	it('rejects license exceeding 50 chars', () => {
		const result = manifestSchema.safeParse({
			...VALID_MANIFEST,
			license: 'L'.repeat(51)
		});
		expect(result.success).toBe(false);
	});

	it('rejects minToolVersion exceeding 20 chars', () => {
		const result = manifestSchema.safeParse({
			...VALID_MANIFEST,
			minToolVersion: '1'.repeat(21)
		});
		expect(result.success).toBe(false);
	});
});
