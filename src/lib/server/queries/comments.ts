import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { comments, setups, users } from '$lib/server/db/schema';

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

export async function createComment(
	setupId: string,
	userId: string,
	body: string,
	parentId?: string
): Promise<{ id: string }> {
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

		await tx
			.update(setups)
			.set({ commentsCount: sql`${setups.commentsCount} + 1` })
			.where(eq(setups.id, setupId));

		return comment;
	});
}
