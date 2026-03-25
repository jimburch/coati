/**
 * Integration tests for comment query functions.
 *
 * These tests hit the real database — no mocks. They require a running
 * PostgreSQL instance pointed to by DATABASE_URL_TEST (preferred) or
 * DATABASE_URL. When neither is set the entire suite is skipped so that
 * the CI unit-test run is unaffected.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

// Must be declared before any module imports so that the hoisted mock is in
// place when $lib/server/db initialises its postgres connection.
vi.mock('$env/static/private', () => ({
	DATABASE_URL:
		process.env.DATABASE_URL_TEST ??
		process.env.DATABASE_URL ??
		'postgresql://coati:coati@localhost:5432/coati_dev',
	GITHUB_CLIENT_ID: 'test',
	GITHUB_CLIENT_SECRET: 'test'
}));

import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { setups } from '$lib/server/db/schema';
import {
	createComment,
	deleteComment,
	getSetupComments,
	InvalidParentError,
	InvalidBodyError,
	ForbiddenError
} from './comments';
import { createTestUser, createTestSetup, deleteTestUsers } from './__tests__/db-test-helpers';

const hasDatabase = !!(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)('comment queries — integration', () => {
	const createdUserIds: string[] = [];

	afterEach(async () => {
		await deleteTestUsers(createdUserIds.splice(0));
	});

	// ---------------------------------------------------------------------------
	// createComment
	// ---------------------------------------------------------------------------

	describe('createComment', () => {
		it('creates a top-level comment and increments commentsCount', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const comment = await createComment(setup.id, user.id, 'Hello, world!');

			expect(comment).toHaveProperty('id');
			expect(typeof comment.id).toBe('string');

			const [updated] = await db
				.select({ commentsCount: setups.commentsCount })
				.from(setups)
				.where(eq(setups.id, setup.id));
			expect(updated.commentsCount).toBe(1);
		});

		it('creates a reply to a top-level comment and increments commentsCount', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const parent = await createComment(setup.id, user.id, 'Parent comment');
			const reply = await createComment(setup.id, user.id, 'Reply comment', parent.id);

			expect(reply).toHaveProperty('id');

			const [updated] = await db
				.select({ commentsCount: setups.commentsCount })
				.from(setups)
				.where(eq(setups.id, setup.id));
			expect(updated.commentsCount).toBe(2);
		});

		it('rejects reply to a reply (INVALID_PARENT)', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const parent = await createComment(setup.id, user.id, 'Top-level comment');
			const reply = await createComment(setup.id, user.id, 'First reply', parent.id);

			await expect(createComment(setup.id, user.id, 'Reply to reply', reply.id)).rejects.toThrow(
				InvalidParentError
			);
		});

		it('rejects empty body', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			await expect(createComment(setup.id, user.id, '')).rejects.toThrow(InvalidBodyError);
		});

		it('rejects body over 5000 chars', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			await expect(createComment(setup.id, user.id, 'a'.repeat(5001))).rejects.toThrow(
				InvalidBodyError
			);
		});
	});

	// ---------------------------------------------------------------------------
	// deleteComment
	// ---------------------------------------------------------------------------

	describe('deleteComment', () => {
		it('deletes own comment and decrements commentsCount', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const comment = await createComment(setup.id, user.id, 'To be deleted');
			await deleteComment(comment.id, user.id);

			const [updated] = await db
				.select({ commentsCount: setups.commentsCount })
				.from(setups)
				.where(eq(setups.id, setup.id));
			expect(updated.commentsCount).toBe(0);
		});

		it('cascade-deletes replies and decrements count by total deleted', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const parent = await createComment(setup.id, user.id, 'Parent');
			await createComment(setup.id, user.id, 'Reply 1', parent.id);
			await createComment(setup.id, user.id, 'Reply 2', parent.id);

			// commentsCount should be 3 at this point
			const [before] = await db
				.select({ commentsCount: setups.commentsCount })
				.from(setups)
				.where(eq(setups.id, setup.id));
			expect(before.commentsCount).toBe(3);

			await deleteComment(parent.id, user.id);

			const [after] = await db
				.select({ commentsCount: setups.commentsCount })
				.from(setups)
				.where(eq(setups.id, setup.id));
			expect(after.commentsCount).toBe(0);
		});

		it("rejects deleting another user's comment (FORBIDDEN)", async () => {
			const owner = await createTestUser();
			const other = await createTestUser();
			const setup = await createTestSetup(owner.id);
			createdUserIds.push(owner.id, other.id);

			const comment = await createComment(setup.id, owner.id, 'Owner comment');

			await expect(deleteComment(comment.id, other.id)).rejects.toThrow(ForbiddenError);
		});
	});

	// ---------------------------------------------------------------------------
	// getSetupComments
	// ---------------------------------------------------------------------------

	describe('getSetupComments', () => {
		it('returns comments with user info ordered oldest-first', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const first = await createComment(setup.id, user.id, 'First comment');
			const second = await createComment(setup.id, user.id, 'Second comment');

			const result = await getSetupComments(setup.id);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe(first.id);
			expect(result[1].id).toBe(second.id);

			// Verify user info is present
			expect(result[0].authorUsername).toBe(user.username);
			expect(result[0].authorAvatarUrl).toBe(user.avatarUrl);
		});

		it('returns empty array for a setup with no comments', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const result = await getSetupComments(setup.id);
			expect(result).toEqual([]);
		});

		it('correctly structures parent/reply relationships', async () => {
			const user = await createTestUser();
			const setup = await createTestSetup(user.id);
			createdUserIds.push(user.id);

			const parent = await createComment(setup.id, user.id, 'Top-level comment');
			const reply = await createComment(setup.id, user.id, 'Reply comment', parent.id);

			const result = await getSetupComments(setup.id);

			expect(result).toHaveLength(2);

			const parentResult = result.find((c) => c.id === parent.id);
			const replyResult = result.find((c) => c.id === reply.id);

			expect(parentResult?.parentId).toBeNull();
			expect(replyResult?.parentId).toBe(parent.id);
		});
	});
});
