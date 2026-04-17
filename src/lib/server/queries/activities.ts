import { and, desc, eq, inArray, lt, ne, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import { activities, comments, follows, setups, teams, users } from '$lib/server/db/schema';

const actorUser = alias(users, 'actor');
const setupOwnerUser = alias(users, 'setup_owner');
const targetUserAlias = alias(users, 'target_user');
const activityTeam = alias(teams, 'activity_team');

export type FeedItem = {
	id: string;
	actionType:
		| 'created_setup'
		| 'commented'
		| 'followed_user'
		| 'starred_setup'
		| 'created_team'
		| 'joined_team'
		| 'left_team'
		| 'invited_to_team';
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
	teamId: string | null;
	teamName: string | null;
	teamSlug: string | null;
	teamAvatarUrl: string | null;
};

const FEED_ACTION_TYPES = [
	'created_setup',
	'commented',
	'followed_user',
	'created_team',
	'joined_team',
	'left_team',
	'invited_to_team'
] as const satisfies readonly FeedItem['actionType'][];

const PROFILE_ACTION_TYPES = [
	'created_setup',
	'commented',
	'followed_user',
	'starred_setup',
	'created_team',
	'joined_team',
	'left_team',
	'invited_to_team'
] as const satisfies readonly FeedItem['actionType'][];

// Private: single 6-join query with cursor pagination.
// Safe cast: actionType is constrained to actionTypes by the WHERE clause.
async function queryFeed(
	filter: SQL | undefined,
	actionTypes: readonly FeedItem['actionType'][],
	cursor: Date | undefined,
	limit: number,
	viewerId?: string
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
	const visibilityCondition = viewerId
		? sql`(${activities.setupId} IS NULL OR ${setups.visibility} = 'public' OR ${setups.userId} = ${viewerId} OR (${setups.teamId} IS NOT NULL AND ${setups.teamId} IN (SELECT team_id FROM team_members WHERE user_id = ${viewerId})))`
		: sql`(${activities.setupId} IS NULL OR ${setups.visibility} = 'public')`;

	const conditions = and(
		filter,
		inArray(activities.actionType, [...actionTypes]),
		...(cursor ? [lt(activities.createdAt, cursor)] : []),
		visibilityCondition
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
			commentBody: comments.body,
			teamId: activities.teamId,
			teamName: activityTeam.name,
			teamSlug: activityTeam.slug,
			teamAvatarUrl: activityTeam.avatarUrl
		})
		.from(activities)
		.innerJoin(actorUser, eq(activities.userId, actorUser.id))
		.leftJoin(setups, eq(activities.setupId, setups.id))
		.leftJoin(setupOwnerUser, eq(setups.userId, setupOwnerUser.id))
		.leftJoin(targetUserAlias, eq(activities.targetUserId, targetUserAlias.id))
		.leftJoin(comments, eq(activities.commentId, comments.id))
		.leftJoin(activityTeam, eq(activities.teamId, activityTeam.id))
		.where(conditions)
		.orderBy(desc(activities.createdAt))
		.limit(limit + 1);

	const hasMore = rows.length > limit;
	const items = hasMore ? rows.slice(0, limit) : rows;

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

	const filter = and(inArray(activities.userId, followingSubquery), ne(activities.userId, userId));

	return queryFeed(filter, FEED_ACTION_TYPES, cursor, limit, userId);
}

export async function getProfileFeed(
	userId: string,
	cursor?: Date,
	limit = 5
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
	const filter = eq(activities.userId, userId);

	return queryFeed(filter, PROFILE_ACTION_TYPES, cursor, limit);
}
