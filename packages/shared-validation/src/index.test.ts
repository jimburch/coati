import { describe, it, expect } from 'vitest';
import {
	PLACEMENT_VALUES,
	COMPONENT_TYPE_VALUES,
	CATEGORY_VALUES,
	SLUG_NAME_REGEX,
	SEMVER_REGEX,
	componentTypeSchema,
	categorySchema,
	postInstallSchema
} from './index.js';

describe('exported constant value sets', () => {
	it('PLACEMENT, COMPONENT_TYPE, and CATEGORY values match their public contracts', () => {
		expect(PLACEMENT_VALUES).toEqual(expect.arrayContaining(['global', 'project']));
		expect(PLACEMENT_VALUES).toHaveLength(2);

		expect(COMPONENT_TYPE_VALUES).toEqual(
			expect.arrayContaining([
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
			])
		);
		expect(COMPONENT_TYPE_VALUES).toHaveLength(10);

		expect(CATEGORY_VALUES).toEqual(
			expect.arrayContaining(['web-dev', 'mobile', 'data-science', 'devops', 'systems', 'general'])
		);
		expect(CATEGORY_VALUES).toHaveLength(6);
	});
});

describe('SLUG_NAME_REGEX', () => {
	it('accepts valid slugs', () => {
		expect(SLUG_NAME_REGEX.test('hello')).toBe(true);
		expect(SLUG_NAME_REGEX.test('hello-world')).toBe(true);
		expect(SLUG_NAME_REGEX.test('abc123')).toBe(true);
		expect(SLUG_NAME_REGEX.test('my-setup-v2')).toBe(true);
	});

	it('rejects invalid slugs', () => {
		expect(SLUG_NAME_REGEX.test('Hello')).toBe(false);
		expect(SLUG_NAME_REGEX.test('-hello')).toBe(false);
		expect(SLUG_NAME_REGEX.test('hello-')).toBe(false);
		expect(SLUG_NAME_REGEX.test('hello--world')).toBe(false);
		expect(SLUG_NAME_REGEX.test('hello world')).toBe(false);
	});
});

describe('SEMVER_REGEX', () => {
	it('accepts valid semver strings', () => {
		expect(SEMVER_REGEX.test('1.0.0')).toBe(true);
		expect(SEMVER_REGEX.test('0.0.1')).toBe(true);
		expect(SEMVER_REGEX.test('12.34.56')).toBe(true);
	});

	it('rejects invalid semver strings', () => {
		expect(SEMVER_REGEX.test('1.0')).toBe(false);
		expect(SEMVER_REGEX.test('1.0.0.0')).toBe(false);
		expect(SEMVER_REGEX.test('v1.0.0')).toBe(false);
		expect(SEMVER_REGEX.test('1.0.x')).toBe(false);
	});
});

describe('componentTypeSchema', () => {
	it('parses valid component types', () => {
		expect(componentTypeSchema.parse('instruction')).toBe('instruction');
		expect(componentTypeSchema.parse('hook')).toBe('hook');
		expect(componentTypeSchema.parse('setup_script')).toBe('setup_script');
	});

	it('rejects invalid component types', () => {
		expect(() => componentTypeSchema.parse('unknown')).toThrow();
	});
});

describe('categorySchema', () => {
	it('parses valid categories', () => {
		expect(categorySchema.parse('web-dev')).toBe('web-dev');
		expect(categorySchema.parse('data-science')).toBe('data-science');
		expect(categorySchema.parse('general')).toBe('general');
	});

	it('rejects invalid categories', () => {
		expect(() => categorySchema.parse('frontend')).toThrow();
	});
});

// Regression test: both web (createSetupWithFilesSchema) and CLI (manifestSchema)
// must accept string[] for postInstall. Both use postInstallSchema from this package.
describe('postInstallSchema', () => {
	it('accepts an array of strings', () => {
		expect(postInstallSchema.parse(['pnpm install', 'cp .env.example .env'])).toEqual([
			'pnpm install',
			'cp .env.example .env'
		]);
	});

	it('accepts an empty array', () => {
		expect(postInstallSchema.parse([])).toEqual([]);
	});

	it('accepts a single-element array', () => {
		expect(postInstallSchema.parse(['pnpm install'])).toEqual(['pnpm install']);
	});

	it('rejects a plain string (not an array)', () => {
		expect(() => postInstallSchema.parse('pnpm install')).toThrow();
	});

	it('rejects an array containing non-strings', () => {
		expect(() => postInstallSchema.parse([1, 2, 3])).toThrow();
	});
});
