import { and, desc, eq, gte, inArray, lt, ne, notInArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '$lib/server/db';
import {
	activities,
	comments,
	follows,
	setups,
	teamMembers,
	teams,
	users
} from '$lib/server/db/schema';
import type { FeedItem } from './activities';

const BUCKET_WEIGHTS = {
	own: 1.0,
	follows: 0.9,
	popular: 0.3
} as const;

const POPULAR_ACTOR_THRESHOLD = 10;
const POPULAR_SETUP_THRESHOLD = 10;
const AGGREGATION_WINDOW_MS = 24 * 60 * 60 * 1000;

// Time constant for exponential recency decay. True half-life is ~33h (48 × ln 2).
const RECENCY_TIME_CONSTANT_HOURS = 48;
const POPULARITY_COEFFICIENT = 0.1;

type Bucket = keyof typeof BUCKET_WEIGHTS;

type ScorableItem = {
	createdAt: Date;
	bucket: Bucket;
	actorFollowersCount: number;
	setupStarsCount: number;
};

function scoreItem(item: ScorableItem, now: Date): number {
	const hoursSince = (now.getTime() - item.createdAt.getTime()) / (60 * 60 * 1000);
	const recencyDecay = Math.exp(-hoursSince / RECENCY_TIME_CONSTANT_HOURS);
	const popularityBoost =
		1 + POPULARITY_COEFFICIENT * Math.log(item.actorFollowersCount + item.setupStarsCount + 1);
	return BUCKET_WEIGHTS[item.bucket] * recencyDecay * popularityBoost;
}

type AggregatableItem = {
	id: string;
	actionType: string;
	createdAt: Date;
	setupId: string | null;
	actorUsername: string;
	actorAvatarUrl: string;
	score: number;
	aggregatedActors?: { username: string; avatarUrl: string }[];
	aggregatedCount?: number;
};

function aggregateStarredItems<T extends AggregatableItem>(items: T[]): T[] {
	type Group = { representative: T; allActors: { username: string; avatarUrl: string }[] };
	const groups = new Map<string, Group>();
	const passthrough: T[] = [];

	// Sort by score DESC so the first item seen for a key becomes representative
	const sorted = [...items].sort((a, b) => b.score - a.score);

	for (const item of sorted) {
		if (item.actionType !== 'starred_setup' || item.setupId === null) {
			passthrough.push(item);
			continue;
		}
		// Groups conceptually keyed by (setupId, 24h-window-from-representative).
		// Implemented as a linear scan because group count is small.
		const existing = [...groups.values()].find(
			(g) =>
				g.representative.setupId === item.setupId &&
				Math.abs(g.representative.createdAt.getTime() - item.createdAt.getTime()) <
					AGGREGATION_WINDOW_MS
		);
		if (existing) {
			existing.allActors.push({
				username: item.actorUsername,
				avatarUrl: item.actorAvatarUrl
			});
		} else {
			groups.set(item.id, {
				representative: item,
				allActors: [{ username: item.actorUsername, avatarUrl: item.actorAvatarUrl }]
			});
		}
	}

	const aggregated: T[] = [];
	for (const group of groups.values()) {
		const { representative, allActors } = group;
		if (allActors.length === 1) {
			aggregated.push(representative);
			continue;
		}
		aggregated.push({
			...representative,
			aggregatedActors: allActors.slice(0, 2),
			aggregatedCount: allActors.length
		});
	}

	return [...aggregated, ...passthrough];
}

const actorUser = alias(users, 'actor');
const setupOwnerUser = alias(users, 'setup_owner');
const targetUserAlias = alias(users, 'target_user');
const activityTeam = alias(teams, 'activity_team');

const ACTIONS = [
	'created_setup',
	'starred_setup',
	'commented',
	'followed_user',
	'created_team',
	'joined_team',
	'left_team',
	'invited_to_team'
] as const;

const CANDIDATE_FETCH_MULTIPLIER = 2;

type RawRow = {
	id: string;
	actionType: string;
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
	actorFollowersCount: number | null;
	setupStarsCount: number | null;
	userId: string;
};

function baseSelect() {
	return db
		.select({
			id: activities.id,
			actionType: activities.actionType,
			createdAt: activities.createdAt,
			userId: activities.userId,
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
			teamAvatarUrl: activityTeam.avatarUrl,
			actorFollowersCount: actorUser.followersCount,
			setupStarsCount: setups.starsCount
		})
		.from(activities)
		.innerJoin(actorUser, eq(activities.userId, actorUser.id))
		.leftJoin(setups, eq(activities.setupId, setups.id))
		.leftJoin(setupOwnerUser, eq(setups.userId, setupOwnerUser.id))
		.leftJoin(targetUserAlias, eq(activities.targetUserId, targetUserAlias.id))
		.leftJoin(comments, eq(activities.commentId, comments.id))
		.leftJoin(activityTeam, eq(activities.teamId, activityTeam.id));
}

function visibilityClause(viewerId: string): SQL {
	return sql`(
		${activities.setupId} IS NULL
		OR ${setups.visibility} = 'public'
		OR ${setups.userId} = ${viewerId}
		OR (${setups.teamId} IS NOT NULL AND ${setups.teamId} IN (
			SELECT team_id FROM team_members WHERE user_id = ${viewerId}
		))
	)`;
}

async function fetchOwnBucket(
	viewerId: string,
	cursor: Date | undefined,
	limit: number
): Promise<RawRow[]> {
	const whereClauses = and(
		eq(activities.userId, viewerId),
		inArray(activities.actionType, [...ACTIONS]),
		...(cursor ? [lt(activities.createdAt, cursor)] : []),
		visibilityClause(viewerId)
	);
	return (await baseSelect()
		.where(whereClauses)
		.orderBy(desc(activities.createdAt))
		.limit(limit * CANDIDATE_FETCH_MULTIPLIER)) as RawRow[];
}

async function fetchFollowsBucket(
	viewerId: string,
	cursor: Date | undefined,
	limit: number
): Promise<RawRow[]> {
	const followingSub = db
		.select({ id: follows.followingId })
		.from(follows)
		.where(eq(follows.followerId, viewerId));
	const whereClauses = and(
		inArray(activities.userId, followingSub),
		ne(activities.userId, viewerId),
		inArray(activities.actionType, [...ACTIONS]),
		...(cursor ? [lt(activities.createdAt, cursor)] : []),
		visibilityClause(viewerId)
	);
	return (await baseSelect()
		.where(whereClauses)
		.orderBy(desc(activities.createdAt))
		.limit(limit * CANDIDATE_FETCH_MULTIPLIER)) as RawRow[];
}

async function fetchPopularBucket(
	viewerId: string,
	cursor: Date | undefined,
	limit: number
): Promise<RawRow[]> {
	const followingSub = db
		.select({ id: follows.followingId })
		.from(follows)
		.where(eq(follows.followerId, viewerId));
	const whereClauses = and(
		ne(activities.userId, viewerId),
		notInArray(activities.userId, followingSub),
		inArray(activities.actionType, [...ACTIONS]),
		or(
			gte(actorUser.followersCount, POPULAR_ACTOR_THRESHOLD),
			gte(setups.starsCount, POPULAR_SETUP_THRESHOLD)
		),
		...(cursor ? [lt(activities.createdAt, cursor)] : []),
		visibilityClause(viewerId)
	);
	return (await baseSelect()
		.where(whereClauses)
		.orderBy(desc(activities.createdAt))
		.limit(limit * CANDIDATE_FETCH_MULTIPLIER)) as RawRow[];
}

async function fetchViewerTeamIds(viewerId: string): Promise<Set<string>> {
	const rows = (await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(eq(teamMembers.userId, viewerId))
		.limit(500)) as { teamId: string }[];
	return new Set(rows.map((r) => r.teamId));
}

function isTeamAction(actionType: string): boolean {
	return (
		actionType === 'created_team' ||
		actionType === 'joined_team' ||
		actionType === 'left_team' ||
		actionType === 'invited_to_team'
	);
}

type NaturalKeyFields = {
	actionType: string;
	userId: string;
	setupId: string | null;
	teamId: string | null;
	targetUserId: string | null;
	commentId: string | null;
};

function naturalKey(r: NaturalKeyFields): string {
	if (r.actionType === 'commented') {
		return `${r.actionType}|${r.userId}|${r.commentId ?? ''}`;
	}
	const target = r.setupId ?? r.teamId ?? r.targetUserId ?? '';
	return `${r.actionType}|${r.userId}|${target}`;
}

async function chronologicalPage(
	viewerId: string,
	cursor: Date,
	limit: number
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
	const followingSub = db
		.select({ id: follows.followingId })
		.from(follows)
		.where(eq(follows.followerId, viewerId));
	const whereClauses = and(
		or(eq(activities.userId, viewerId), inArray(activities.userId, followingSub)),
		inArray(activities.actionType, [...ACTIONS]),
		lt(activities.createdAt, cursor),
		visibilityClause(viewerId)
	);
	const rows = (await baseSelect()
		.where(whereClauses)
		.orderBy(desc(activities.createdAt))
		.limit(limit + 1)) as RawRow[];

	const viewerTeamIds = await fetchViewerTeamIds(viewerId);
	const gated = rows.filter(
		(r) => !isTeamAction(r.actionType) || (r.teamId && viewerTeamIds.has(r.teamId))
	);
	const byNaturalKey = new Map<string, RawRow>();
	for (const r of gated) {
		if (!byNaturalKey.has(naturalKey(r))) byNaturalKey.set(naturalKey(r), r);
	}
	const collapsed = [...byNaturalKey.values()];
	const hasMore = collapsed.length > limit;
	const pageRows = hasMore ? collapsed.slice(0, limit) : collapsed;
	const items: FeedItem[] = pageRows.map((r) => ({
		id: r.id,
		actionType: r.actionType as FeedItem['actionType'],
		createdAt: r.createdAt,
		actorUsername: r.actorUsername,
		actorAvatarUrl: r.actorAvatarUrl,
		setupId: r.setupId,
		setupName: r.setupName,
		setupSlug: r.setupSlug,
		setupOwnerUsername: r.setupOwnerUsername,
		targetUserId: r.targetUserId,
		targetUsername: r.targetUsername,
		targetAvatarUrl: r.targetAvatarUrl,
		commentId: r.commentId,
		commentBody: r.commentBody,
		teamId: r.teamId,
		teamName: r.teamName,
		teamSlug: r.teamSlug,
		teamAvatarUrl: r.teamAvatarUrl,
		isPopular: false,
		isOwnActivity: r.userId === viewerId
	}));

	const nextCursor =
		hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;
	return { items, nextCursor };
}

export async function getBlendedActivityFeed(
	viewerId: string,
	cursor: Date | undefined,
	limit: number
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
	if (cursor) {
		// Subsequent pages: plain chronological from own + follows. No scoring, no popular bucket.
		return chronologicalPage(viewerId, cursor, limit);
	}
	// First page: score-ranked merge across own + follows + popular buckets.
	const [ownRows, followRows, popularRows, viewerTeamIds] = await Promise.all([
		fetchOwnBucket(viewerId, cursor, limit),
		fetchFollowsBucket(viewerId, cursor, limit),
		fetchPopularBucket(viewerId, cursor, limit),
		fetchViewerTeamIds(viewerId)
	]);

	const now = new Date();
	const tag = (rows: RawRow[], bucket: Bucket): (RawRow & { bucket: Bucket; score: number })[] =>
		rows.map((r) => ({
			...r,
			bucket,
			score: scoreItem(
				{
					createdAt: r.createdAt,
					bucket,
					actorFollowersCount: r.actorFollowersCount ?? 0,
					setupStarsCount: r.setupStarsCount ?? 0
				},
				now
			)
		}));

	const combined = [
		...tag(ownRows, 'own'),
		...tag(followRows, 'follows'),
		...tag(popularRows, 'popular')
	];

	// De-dupe by activity id (same row can be pulled by multiple buckets defensively)
	const byId = new Map<string, (typeof combined)[number]>();
	for (const r of combined) {
		const existing = byId.get(r.id);
		if (!existing || r.score > existing.score) byId.set(r.id, r);
	}
	const unique = [...byId.values()];

	// Team visibility gate
	const gated = unique.filter(
		(r) => !isTeamAction(r.actionType) || (r.teamId && viewerTeamIds.has(r.teamId))
	);

	// Natural-key dedupe: collapse "same user did same action to same target" rows
	// (e.g., star/unstar/star creating multiple starred_setup rows). Keep highest-scored.
	const byNaturalKey = new Map<string, (typeof gated)[number]>();
	for (const r of gated) {
		const key = naturalKey(r);
		const existing = byNaturalKey.get(key);
		if (!existing || r.score > existing.score) byNaturalKey.set(key, r);
	}
	const collapsed = [...byNaturalKey.values()];

	// Aggregate starred_setup within 24h on same setup
	type AggregatableWithSource = AggregatableItem & {
		_source: RawRow & { bucket: Bucket; score: number };
	};
	const aggregatable: AggregatableWithSource[] = collapsed.map((r) => ({
		id: r.id,
		actionType: r.actionType,
		createdAt: r.createdAt,
		setupId: r.setupId,
		actorUsername: r.actorUsername,
		actorAvatarUrl: r.actorAvatarUrl,
		score: r.score,
		_source: r
	}));
	const aggregated = aggregateStarredItems(aggregatable);

	// Sort and take top N
	aggregated.sort((a, b) => b.score - a.score);
	const top = aggregated.slice(0, limit);

	const items: FeedItem[] = top.map((t) => {
		const r = t._source;
		return {
			id: r.id,
			actionType: r.actionType as FeedItem['actionType'],
			createdAt: r.createdAt,
			actorUsername: r.actorUsername,
			actorAvatarUrl: r.actorAvatarUrl,
			setupId: r.setupId,
			setupName: r.setupName,
			setupSlug: r.setupSlug,
			setupOwnerUsername: r.setupOwnerUsername,
			targetUserId: r.targetUserId,
			targetUsername: r.targetUsername,
			targetAvatarUrl: r.targetAvatarUrl,
			commentId: r.commentId,
			commentBody: r.commentBody,
			teamId: r.teamId,
			teamName: r.teamName,
			teamSlug: r.teamSlug,
			teamAvatarUrl: r.teamAvatarUrl,
			isPopular: r.bucket === 'popular',
			isOwnActivity: r.userId === viewerId,
			aggregatedActors: t.aggregatedActors,
			aggregatedCount: t.aggregatedCount
		};
	});

	const hasMore = aggregated.length > limit;
	// Items are score-sorted, so the last item isn't necessarily the oldest. Use the minimum
	// createdAt across the page so the follow-up chronological query can't overlap page 1.
	const nextCursor =
		hasMore && items.length > 0
			? new Date(Math.min(...items.map((i) => i.createdAt.getTime()))).toISOString()
			: null;

	return { items, nextCursor };
}
