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
	description: 'A setup',
	placement: 'global' as const
};
import { z } from 'zod';

describe('API response schemas', () => {
	describe('apiSuccessSchema', () => {
		it('wraps data in { data: T }', () => {
			expect(apiSuccessSchema).toBeDefined();
			const schema = apiSuccessSchema(z.object({ id: z.string() }));
			const result = schema.safeParse({ data: { id: '123' } });
			expect(result.success).toBe(true);
		});

		it('rejects missing data field', () => {
			const schema = apiSuccessSchema(z.object({ id: z.string() }));
			const result = schema.safeParse({ id: '123' });
			expect(result.success).toBe(false);
		});
	});

	describe('apiErrorSchema', () => {
		it('validates { error: string, code: string }', () => {
			expect(apiErrorSchema).toBeDefined();
			const result = apiErrorSchema.safeParse({ error: 'Not found', code: 'NOT_FOUND' });
			expect(result.success).toBe(true);
		});

		it('rejects missing error field', () => {
			const result = apiErrorSchema.safeParse({ code: 'NOT_FOUND' });
			expect(result.success).toBe(false);
		});

		it('rejects missing code field', () => {
			const result = apiErrorSchema.safeParse({ error: 'Not found' });
			expect(result.success).toBe(false);
		});
	});
});

describe('Input validation schemas', () => {
	describe('createSetupSchema', () => {
		const validInput = {
			name: 'My Claude Setup',
			slug: 'my-claude-setup',
			description: 'A great setup for Claude Code'
		};

		it('accepts valid input', () => {
			expect(createSetupSchema).toBeDefined();
			const result = createSetupSchema.safeParse(validInput);
			expect(result.success).toBe(true);
		});

		it('rejects empty name', () => {
			const result = createSetupSchema.safeParse({ ...validInput, name: '' });
			expect(result.success).toBe(false);
		});

		it('rejects name over 100 chars', () => {
			const result = createSetupSchema.safeParse({ ...validInput, name: 'a'.repeat(101) });
			expect(result.success).toBe(false);
		});

		it('rejects slug with uppercase', () => {
			const result = createSetupSchema.safeParse({ ...validInput, slug: 'My-Setup' });
			expect(result.success).toBe(false);
		});

		it('rejects slug with spaces', () => {
			const result = createSetupSchema.safeParse({ ...validInput, slug: 'my setup' });
			expect(result.success).toBe(false);
		});

		it('rejects slug over 100 chars', () => {
			const result = createSetupSchema.safeParse({ ...validInput, slug: 'a'.repeat(101) });
			expect(result.success).toBe(false);
		});

		it('rejects description over 300 chars', () => {
			const result = createSetupSchema.safeParse({
				...validInput,
				description: 'a'.repeat(301)
			});
			expect(result.success).toBe(false);
		});
	});

	describe('createCommentSchema', () => {
		it('accepts valid body', () => {
			expect(createCommentSchema).toBeDefined();
			const result = createCommentSchema.safeParse({ body: 'Great setup!' });
			expect(result.success).toBe(true);
		});

		it('rejects empty body', () => {
			const result = createCommentSchema.safeParse({ body: '' });
			expect(result.success).toBe(false);
		});

		it('rejects body over 5000 chars', () => {
			const result = createCommentSchema.safeParse({ body: 'a'.repeat(5001) });
			expect(result.success).toBe(false);
		});

		it('accepts valid parentId', () => {
			const result = createCommentSchema.safeParse({
				body: 'Reply',
				parentId: '550e8400-e29b-41d4-a716-446655440000'
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid parentId format', () => {
			const result = createCommentSchema.safeParse({
				body: 'Reply',
				parentId: 'not-a-uuid'
			});
			expect(result.success).toBe(false);
		});

		it('accepts missing parentId (optional)', () => {
			const result = createCommentSchema.safeParse({ body: 'Top-level comment' });
			expect(result.success).toBe(true);
		});
	});

	describe('usernameSchema', () => {
		it('accepts valid username', () => {
			expect(usernameSchema).toBeDefined();
			const result = usernameSchema.safeParse('cool-dev');
			expect(result.success).toBe(true);
		});

		it('accepts alphanumeric username', () => {
			const result = usernameSchema.safeParse('dev123');
			expect(result.success).toBe(true);
		});

		it('rejects uppercase', () => {
			const result = usernameSchema.safeParse('CoolDev');
			expect(result.success).toBe(false);
		});

		it('rejects leading hyphen', () => {
			const result = usernameSchema.safeParse('-cooldev');
			expect(result.success).toBe(false);
		});

		it('rejects trailing hyphen', () => {
			const result = usernameSchema.safeParse('cooldev-');
			expect(result.success).toBe(false);
		});

		it('rejects username shorter than 2 chars', () => {
			const result = usernameSchema.safeParse('a');
			expect(result.success).toBe(false);
		});

		it('rejects username longer than 50 chars', () => {
			const result = usernameSchema.safeParse('a'.repeat(51));
			expect(result.success).toBe(false);
		});
	});
});

describe('File size limit schemas', () => {
	describe('createSetupFileSchema content limit', () => {
		it('rejects file content over 100KB (102401 chars)', () => {
			const result = createSetupFileSchema.safeParse(makeFile('a'.repeat(102401)));
			expect(result.success).toBe(false);
		});

		it('accepts file content at exactly 100KB (102400 chars)', () => {
			const result = createSetupFileSchema.safeParse(makeFile('a'.repeat(102400)));
			expect(result.success).toBe(true);
		});
	});

	describe('createSetupWithFilesSchema file limits', () => {
		it('rejects when files.length > 50', () => {
			const result = createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: Array.from({ length: 51 }, (_, i) => makeFile(`content-${i}`))
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const messages = result.error.issues.map((i) => i.message);
				expect(messages).toContain('Maximum 50 files per setup');
			}
		});

		it('accepts exactly 50 files', () => {
			const result = createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: Array.from({ length: 50 }, (_, i) => makeFile(`content-${i}`))
			});
			expect(result.success).toBe(true);
		});

		it('accepts total content at exactly 1MB', () => {
			// 1048576 bytes in a single file is over per-file limit, so split: 10 × 102400 + 1 × 48576 = 1072576... use 1 big-ish file
			// Better: 10 files × 100KB + 1 file with remaining bytes to hit exactly 1MB total
			// 10 × 100000 = 1000000, remainder = 48576 bytes → total = 1048576
			const result = createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: [
					...Array.from({ length: 10 }, () => makeFile('a'.repeat(100000))),
					makeFile('b'.repeat(48576))
				]
			});
			expect(result.success).toBe(true);
		});

		it('rejects when total content size > 1MB (11 files × 100KB each)', () => {
			// 11 × 102400 = 1126400 > 1048576; each file individually is within limit
			const result = createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: Array.from({ length: 11 }, () => makeFile('a'.repeat(102400)))
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const messages = result.error.issues.map((i) => i.message);
				expect(messages).toContain('Setup exceeds 1MB total limit');
			}
		});

		it('accepts valid payload with small files', () => {
			const result = createSetupWithFilesSchema.safeParse({
				...validSetupBase,
				files: [makeFile('small content'), makeFile('another file')]
			});
			expect(result.success).toBe(true);
		});
	});

	describe('updateSetupSchema file limits', () => {
		it('rejects file content over 100KB', () => {
			const result = updateSetupSchema.safeParse({
				files: [makeFile('a'.repeat(102401))]
			});
			expect(result.success).toBe(false);
		});

		it('rejects when files.length > 50', () => {
			const result = updateSetupSchema.safeParse({
				files: Array.from({ length: 51 }, (_, i) => makeFile(`content-${i}`))
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const messages = result.error.issues.map((i) => i.message);
				expect(messages).toContain('Maximum 50 files per setup');
			}
		});

		it('rejects when total content size > 1MB', () => {
			const result = updateSetupSchema.safeParse({
				files: Array.from({ length: 11 }, () => makeFile('a'.repeat(102400)))
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const messages = result.error.issues.map((i) => i.message);
				expect(messages).toContain('Setup exceeds 1MB total limit');
			}
		});

		it('accepts valid payload with files', () => {
			const result = updateSetupSchema.safeParse({
				name: 'Updated Name',
				files: [makeFile('hello'), makeFile('world')]
			});
			expect(result.success).toBe(true);
		});
	});
});
