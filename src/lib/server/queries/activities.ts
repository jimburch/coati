import { and, desc, eq, inArray, lt, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { activities, comments, follows, setups, users } from '$lib/server/db/schema';

const actorUser = alias(users, 'actor');
const setupOwnerUser = alias(users, 'setup_owner');
const targetUserAlias = alias(users, 'target_user');

export type FeedItem = {
	id: string;
	actionType: 'created_setup' | 'commented' | 'followed_user';
	createdAt: Date;
	actorUsername: string;
	actorAvatarUrl: string;
	setupId: string | null;
	setupName: string | null;
	setupSlug: string | null;
	setupOwnerUsername: string | null;
	targetUserId: string | null;
	targetUsername: string | null;
	targetAvatarUrl: string | null;
	commentId: string | null;
	commentBody: string | null;
};

const FEED_ACTION_TYPES = ['created_setup', 'commented', 'followed_user'] as const;

export async function getHomeFeed(
	userId: string,
	cursor?: Date,
	limit = 20
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
	// Subquery: UUIDs of users the current user follows
	const followingSubquery = db
		.select({ id: follows.followingId })
		.from(follows)
		.where(eq(follows.followerId, userId));

	const conditions = and(
		inArray(activities.userId, followingSubquery),
		inArray(activities.actionType, [...FEED_ACTION_TYPES]),
		ne(activities.userId, userId),
		...(cursor ? [lt(activities.createdAt, cursor)] : [])
	);

	// Fetch limit+1 to detect whether a next page exists
	const rows = await db
		.select({
			id: activities.id,
			actionType: activities.actionType,
			createdAt: activities.createdAt,
			actorUsername: actorUser.username,
			actorAvatarUrl: actorUser.avatarUrl,
			setupId: activities.setupId,
			setupName: setups.name,
			setupSlug: setups.slug,
			setupOwnerUsername: setupOwnerUser.username,
			targetUserId: activities.targetUserId,
			targetUsername: targetUserAlias.username,
			targetAvatarUrl: targetUserAlias.avatarUrl,
			commentId: activities.commentId,
			commentBody: comments.body
		})
		.from(activities)
		.innerJoin(actorUser, eq(activities.userId, actorUser.id))
		.leftJoin(setups, eq(activities.setupId, setups.id))
		.leftJoin(setupOwnerUser, eq(setups.userId, setupOwnerUser.id))
		.leftJoin(targetUserAlias, eq(activities.targetUserId, targetUserAlias.id))
		.leftJoin(comments, eq(activities.commentId, comments.id))
		.where(conditions)
		.orderBy(desc(activities.createdAt))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	const items = hasMore ? rows.slice(0, limit) : rows;

	// Cast: actionType is narrowed to the three display types by the WHERE filter
	const feedItems = items.map((row) => ({
		...row,
		actionType: row.actionType as FeedItem['actionType']
	}));

	const nextCursor =
		hasMore && feedItems.length > 0
			? feedItems[feedItems.length - 1].createdAt.toISOString()
			: null;

	return { items: feedItems, nextCursor };
}
