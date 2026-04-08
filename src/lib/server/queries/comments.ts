import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { comments, users, activities } from '$lib/server/db/schema';
import { counters } from '$lib/server/counters';

export type CommentWithAuthor = {
	id: string;
	body: string;
	parentId: string | null;
	createdAt: Date;
	authorUsername: string;
	authorAvatarUrl: string;
};

export class InvalidParentError extends Error {
	code = 'INVALID_PARENT';
	constructor() {
		super('Parent comment is not a top-level comment');
	}
}

export class InvalidBodyError extends Error {
	code = 'INVALID_BODY';
	constructor(message: string) {
		super(message);
	}
}

export class ForbiddenError extends Error {
	code = 'FORBIDDEN';
	constructor() {
		super('You do not have permission to delete this comment');
	}
}

export class NotFoundError extends Error {
	code = 'NOT_FOUND';
	constructor() {
		super('Comment not found');
	}
}

export async function getSetupComments(setupId: string): Promise<CommentWithAuthor[]> {
	return db
		.select({
			id: comments.id,
			body: comments.body,
			parentId: comments.parentId,
			createdAt: comments.createdAt,
			authorUsername: users.username,
			authorAvatarUrl: users.avatarUrl
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(eq(comments.setupId, setupId))
		.orderBy(comments.createdAt);
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
	await db.transaction(async (tx) => {
		const [comment] = await tx
			.select({
				id: comments.id,
				userId: comments.userId,
				setupId: comments.setupId,
				parentId: comments.parentId
			})
			.from(comments)
			.where(eq(comments.id, commentId))
			.limit(1);

		if (!comment) {
			throw new NotFoundError();
		}
		if (comment.userId !== userId) {
			throw new ForbiddenError();
		}

		// Count replies if this is a top-level comment
		let totalDeleted = 1;
		if (comment.parentId === null) {
			const replies = await tx
				.select({ id: comments.id })
				.from(comments)
				.where(eq(comments.parentId, commentId));

			// Delete replies first
			if (replies.length > 0) {
				await tx.delete(comments).where(eq(comments.parentId, commentId));
				totalDeleted += replies.length;
			}
		}

		// Delete the comment itself
		await tx.delete(comments).where(eq(comments.id, commentId));

		// Decrement commentsCount by total deleted rows
		await counters.commentsDeleted(tx, comment.setupId, totalDeleted);
	});
}

export async function createComment(
	setupId: string,
	userId: string,
	body: string,
	parentId?: string
): Promise<{ id: string }> {
	if (!body || body.trim().length === 0) {
		throw new InvalidBodyError('Body cannot be empty');
	}
	if (body.length > 5000) {
		throw new InvalidBodyError('Body cannot exceed 5000 characters');
	}

	return db.transaction(async (tx) => {
		if (parentId) {
			const parent = await tx
				.select({ id: comments.id, parentId: comments.parentId })
				.from(comments)
				.where(and(eq(comments.id, parentId), eq(comments.setupId, setupId)))
				.limit(1);

			if (parent.length === 0 || parent[0].parentId !== null) {
				throw new InvalidParentError();
			}
		}

		const [comment] = await tx
			.insert(comments)
			.values({ setupId, userId, body, parentId: parentId ?? null })
			.returning({ id: comments.id });

		await counters.commentCreated(tx, setupId);

		await tx
			.insert(activities)
			.values({ userId, setupId, commentId: comment.id, actionType: 'commented' });

		return comment;
	});
}
