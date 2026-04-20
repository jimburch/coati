import { describe, it, expect } from 'vitest';
import {
	apiSuccessSchema,
	apiErrorSchema,
	createSetupSchema,
	createSetupFileSchema,
	createSetupWithFilesSchema,
	updateSetupSchema,
	createCommentSchema,
	usernameSchema
} from './index';

function makeFile(content: string = 'x') {
	return { path: 'a.md', content };
}

const validSetupBase = {
	name: 'My Setup',
	slug: 'my-setup',
	description: 'A setup'
};
import { z } from 'zod';

describe('API response schemas', () => {
	it('apiSuccessSchema validates { data: T } and rejects missing data', () => {
		const schema = apiSuccessSchema(z.object({ id: z.string() }));
		expect(schema.safeParse({ data: { id: '123' } }).success).toBe(true);
		expect(schema.safeParse({ id: '123' }).success).toBe(false);
	});

	it('apiErrorSchema validates { error, code } and requires both fields', () => {
		expect(apiErrorSchema.safeParse({ error: 'Not found', code: 'NOT_FOUND' }).success).toBe(true);
		expect(apiErrorSchema.safeParse({ code: 'NOT_FOUND' }).success).toBe(false);
		expect(apiErrorSchema.safeParse({ error: 'Not found' }).success).toBe(false);
	});
});

describe('Input validation schemas', () => {
	it('createSetupSchema: accepts valid input and rejects bad name/slug/description', () => {
		const valid = {
			name: 'My Claude Setup',
			slug: 'my-claude-setup',
			description: 'A great setup for Claude Code'
		};
		expect(createSetupSchema.safeParse(valid).success).toBe(true);
		expect(createSetupSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
		expect(createSetupSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false);
		expect(createSetupSchema.safeParse({ ...valid, slug: 'My-Setup' }).success).toBe(false);
		expect(createSetupSchema.safeParse({ ...valid, slug: 'my setup' }).success).toBe(false);
		expect(createSetupSchema.safeParse({ ...valid, slug: 'a'.repeat(101) }).success).toBe(false);
		expect(createSetupSchema.safeParse({ ...valid, description: 'a'.repeat(301) }).success).toBe(
			false
		);
	});

	it('createCommentSchema: validates body length and optional UUID parentId', () => {
		expect(createCommentSchema.safeParse({ body: 'Great setup!' }).success).toBe(true);
		expect(createCommentSchema.safeParse({ body: 'Top-level comment' }).success).toBe(true);
		expect(
			createCommentSchema.safeParse({
				body: 'Reply',
				parentId: '550e8400-e29b-41d4-a716-446655440000'
			}).success
		).toBe(true);
		expect(createCommentSchema.safeParse({ body: '' }).success).toBe(false);
		expect(createCommentSchema.safeParse({ body: 'a'.repeat(5001) }).success).toBe(false);
		expect(createCommentSchema.safeParse({ body: 'Reply', parentId: 'not-a-uuid' }).success).toBe(
			false
		);
	});

	it('usernameSchema: accepts lowercase/alphanumeric with interior hyphens and rejects bad formats', () => {
		expect(usernameSchema.safeParse('cool-dev').success).toBe(true);
		expect(usernameSchema.safeParse('dev123').success).toBe(true);
		expect(usernameSchema.safeParse('CoolDev').success).toBe(false);
		expect(usernameSchema.safeParse('-cooldev').success).toBe(false);
		expect(usernameSchema.safeParse('cooldev-').success).toBe(false);
		expect(usernameSchema.safeParse('a').success).toBe(false);
		expect(usernameSchema.safeParse('a'.repeat(51)).success).toBe(false);
	});
});

describe('File size limit schemas', () => {
	it('createSetupFileSchema enforces the 100KB per-file content limit', () => {
		expect(createSetupFileSchema.safeParse(makeFile('a'.repeat(102400))).success).toBe(true);
		expect(createSetupFileSchema.safeParse(makeFile('a'.repeat(102401))).success).toBe(false);
	});

	it('createSetupWithFilesSchema enforces 50-file and 1MB total limits', () => {
		// Accepts baseline, 50 files, and exactly-1MB total
		expect(
			createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: [makeFile('small content'), makeFile('another file')]
			}).success
		).toBe(true);
		expect(
			createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: Array.from({ length: 50 }, (_, i) => makeFile(`content-${i}`))
			}).success
		).toBe(true);
		expect(
			createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: [
					...Array.from({ length: 10 }, () => makeFile('a'.repeat(100000))),
					makeFile('b'.repeat(48576))
				]
			}).success
		).toBe(true);

		// Rejects >50 files with the right message
		const over50 = createSetupWithFilesSchema.safeParse({
			...validSetupBase,
			files: Array.from({ length: 51 }, (_, i) => makeFile(`content-${i}`))
		});
		expect(over50.success).toBe(false);
		if (!over50.success) {
			expect(over50.error.issues.map((i) => i.message)).toContain('Maximum 50 files per setup');
		}

		// Rejects >1MB total with the right message (11 × 100KB)
		const over1mb = createSetupWithFilesSchema.safeParse({
			...validSetupBase,
			files: Array.from({ length: 11 }, () => makeFile('a'.repeat(102400)))
		});
		expect(over1mb.success).toBe(false);
		if (!over1mb.success) {
			expect(over1mb.error.issues.map((i) => i.message)).toContain('Setup exceeds 1MB total limit');
		}
	});

	it('display field: optional, max 150 chars, trimmed, and nullable on update across all schemas', () => {
		const setupBase = { name: 'My Setup', slug: 'my-setup', description: 'A setup' };

		// createSetupSchema
		const created = createSetupSchema.safeParse({ ...setupBase, display: 'My Display Name' });
		expect(created.success).toBe(true);
		if (created.success) expect(created.data.display).toBe('My Display Name');

		const createdNoDisplay = createSetupSchema.safeParse(setupBase);
		expect(createdNoDisplay.success).toBe(true);
		if (createdNoDisplay.success) expect(createdNoDisplay.data.display).toBeUndefined();

		const createdTrimmed = createSetupSchema.safeParse({ ...setupBase, display: '  trimmed  ' });
		expect(createdTrimmed.success).toBe(true);
		if (createdTrimmed.success) expect(createdTrimmed.data.display).toBe('trimmed');

		expect(createSetupSchema.safeParse({ ...setupBase, display: 'a'.repeat(151) }).success).toBe(
			false
		);

		// createSetupWithFilesSchema
		const withFiles = createSetupWithFilesSchema.safeParse({
			...validSetupBase,
			display: 'Display Name'
		});
		expect(withFiles.success).toBe(true);
		if (withFiles.success) expect(withFiles.data.display).toBe('Display Name');

		// updateSetupSchema (nullable, trimmed, max 150)
		const updated = updateSetupSchema.safeParse({ display: 'Updated Display' });
		expect(updated.success).toBe(true);
		if (updated.success) expect(updated.data.display).toBe('Updated Display');

		const updatedNull = updateSetupSchema.safeParse({ display: null });
		expect(updatedNull.success).toBe(true);
		if (updatedNull.success) expect(updatedNull.data.display).toBeNull();

		const updatedTrimmed = updateSetupSchema.safeParse({ display: '  trimmed  ' });
		expect(updatedTrimmed.success).toBe(true);
		if (updatedTrimmed.success) expect(updatedTrimmed.data.display).toBe('trimmed');

		expect(updateSetupSchema.safeParse({ display: 'a'.repeat(151) }).success).toBe(false);
	});

	it('strips the removed placement field from create/update schemas', () => {
		const created = createSetupWithFilesSchema.safeParse({
			...validSetupBase,
			placement: 'global'
		});
		expect(created.success).toBe(true);
		if (created.success) expect(created.data).not.toHaveProperty('placement');

		const updated = updateSetupSchema.safeParse({ placement: 'project' });
		expect(updated.success).toBe(true);
		if (updated.success) expect(updated.data).not.toHaveProperty('placement');

		expect(createSetupWithFilesSchema.safeParse(validSetupBase).success).toBe(true);
	});

	it('updateSetupSchema enforces the same per-file and total limits as create', () => {
		expect(
			updateSetupSchema.safeParse({
				name: 'Updated Name',
				files: [makeFile('hello'), makeFile('world')]
			}).success
		).toBe(true);

		expect(updateSetupSchema.safeParse({ files: [makeFile('a'.repeat(102401))] }).success).toBe(
			false
		);

		const tooMany = updateSetupSchema.safeParse({
			files: Array.from({ length: 51 }, (_, i) => makeFile(`content-${i}`))
		});
		expect(tooMany.success).toBe(false);
		if (!tooMany.success) {
			expect(tooMany.error.issues.map((i) => i.message)).toContain('Maximum 50 files per setup');
		}

		const tooBig = updateSetupSchema.safeParse({
			files: Array.from({ length: 11 }, () => makeFile('a'.repeat(102400)))
		});
		expect(tooBig.success).toBe(false);
		if (!tooBig.success) {
			expect(tooBig.error.issues.map((i) => i.message)).toContain('Setup exceeds 1MB total limit');
		}
	});
});
