# ACTIVITY Panel Blend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's notifications-style "YOUR ACTIVITY" panel with a blended ACTIVITY feed (own + follows + popular sprinkles), and unify `/feed` on the same query.

**Architecture:** A new `getBlendedActivityFeed` pulls candidates from three parallel bucket queries (own, follows, popular), scores each row by `bucket_weight × recency_decay × popularity_boost`, aggregates same-setup `starred_setup` events within 24h, and returns the top N. The existing `ActivityItem.svelte` gains rendering for "You" voice, a popular pill, an avatar stack for aggregates, and team events. A thin `ActivityPanel.svelte` wraps `ActivityFeed` with the dashboard-specific header, footer, and empty state.

**Tech Stack:** SvelteKit, TypeScript strict, Drizzle ORM (PostgreSQL), Vitest, Playwright, Tailwind CSS, shadcn-svelte.

**Project convention notes:**

- Component tests in this repo extract **pure logic** into helper functions colocated with tests rather than rendering components — follow that pattern for `ActivityPanel` / `ActivityItem` new behavior.
- Query tests mock `drizzle-orm`, `drizzle-orm/pg-core`, `$lib/server/db/schema`, and `$lib/server/db` with hoisted state (see `src/lib/server/queries/activities.test.ts` for the canonical pattern).
- Commit style is Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, `chore(...)`).
- Per `CLAUDE.md`: only the user commits on this repo unless running as a Ralph worker. Each task's final step is a commit — either run it yourself if you're a Ralph worker, or stop before it and hand to the user.
- Always run `pnpm ci:checks` (= `pnpm check && pnpm lint && pnpm test:unit --run`) before declaring the plan complete.

---

## File Structure

**New files**

| Path                                                | Responsibility                                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/queries/activityFeed.ts`            | Exports `getBlendedActivityFeed(viewerId, cursor?, limit)`. Orchestrates own/follows/popular bucket pulls, scoring, aggregation. Internal helpers for each bucket plus `scoreItem` and `aggregateStarredItems`. |
| `src/lib/server/queries/activityFeed.test.ts`       | Unit tests for the query module, using the same hoisted-mock pattern as `activities.test.ts`.                                                                                                                   |
| `src/lib/server/queries/activityFeed.logic.ts`      | Pure logic extracted from the query module: `scoreItem`, `aggregateStarredItems`, bucket-weight constants. Zero DB dependencies.                                                                                |
| `src/lib/server/queries/activityFeed.logic.test.ts` | Unit tests for pure logic (no mocks required).                                                                                                                                                                  |
| `src/lib/components/ActivityPanel.svelte`           | Dashboard panel wrapper — header, `ActivityFeed` reuse, footer (`Load more` + `See all →`), empty state + dismissible follow CTA.                                                                               |
| `src/lib/components/ActivityPanel.test.ts`          | Pure logic extracted from `ActivityPanel` (empty-state resolution, follow-CTA visibility, dismiss persistence).                                                                                                 |
| `src/lib/components/ActivityItem.logic.ts`          | Pure logic extracted from `ActivityItem`: `resolveActorLabel`, `aggregatedActorsText`, copy-template resolvers for all action types.                                                                            |
| `src/lib/components/ActivityItem.test.ts`           | Unit tests for `ActivityItem.logic.ts`.                                                                                                                                                                         |

**Modified files**

| Path                                     | Change                                                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/queries/activities.ts`   | Extend `FeedItem` type (new optional fields). Delete `getHomeFeed` and `getActivityOnUserSetups` + `SetupActivityEntry`. `getProfileFeed` and `queryFeed` unchanged. |
| `src/lib/components/ActivityItem.svelte` | Use `ActivityItem.logic.ts` helpers. Render "You" voice, popular pill, avatar stack for aggregates, team event text.                                                 |
| `src/routes/+page.server.ts`             | Replace `getActivityOnUserSetups` call with `getBlendedActivityFeed(viewerId, undefined, 8)`. Rename `yourActivity` → `activityFeed`.                                |
| `src/routes/+page.svelte`                | Swap `YourActivityPanel` import/usage for `ActivityPanel`. Update `data-testid` to `activity-panel`.                                                                 |
| `src/routes/(app)/feed/+page.server.ts`  | Call `getBlendedActivityFeed(viewer.id, undefined, 20)`.                                                                                                             |
| `src/routes/api/v1/feed/+server.ts`      | Call `getBlendedActivityFeed`. Keep cursor parsing as-is (ISO date).                                                                                                 |
| `src/routes/page.svelte.e2e.ts`          | Rename `your-activity-panel` → `activity-panel`. Add tests for Load more / See all.                                                                                  |
| `src/lib/server/db/schema.ts`            | No change (relies on existing `users.followersCount`, `setups.starsCount` columns).                                                                                  |

**Deleted files**

- `src/lib/components/YourActivityPanel.svelte`
- `src/lib/server/queries/activityOnUserSetups.test.ts`
- Any `getHomeFeed`-only tests in `src/lib/server/queries/activities.test.ts` (leave `queryFeed`/`getProfileFeed` coverage intact).

**Pagination decision (simplification vs. spec):** first page (no cursor) is score-ranked from all three buckets; subsequent pages (`?cursor=<ISO>`) are plain chronological from the own+follows buckets (same as the current `/feed` behaviour). This keeps the existing cursor contract at `src/routes/api/v1/feed/+server.ts` unchanged, and the "curated top, then chronological" pattern is predictable. Update spec's pagination paragraph if changes ship differently.

---

## Task 1: Pure scoring + aggregation logic

**Files:**

- Create: `src/lib/server/queries/activityFeed.logic.ts`
- Create: `src/lib/server/queries/activityFeed.logic.test.ts`

- [ ] **Step 1: Write the failing tests**

Write `src/lib/server/queries/activityFeed.logic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
	BUCKET_WEIGHTS,
	POPULAR_ACTOR_THRESHOLD,
	POPULAR_SETUP_THRESHOLD,
	AGGREGATION_WINDOW_MS,
	scoreItem,
	aggregateStarredItems,
	type ScorableItem,
	type AggregatableItem
} from './activityFeed.logic';

describe('BUCKET_WEIGHTS', () => {
	it('own > follows > popular', () => {
		expect(BUCKET_WEIGHTS.own).toBeGreaterThan(BUCKET_WEIGHTS.follows);
		expect(BUCKET_WEIGHTS.follows).toBeGreaterThan(BUCKET_WEIGHTS.popular);
	});
});

describe('thresholds', () => {
	it('POPULAR_ACTOR_THRESHOLD is 10', () => {
		expect(POPULAR_ACTOR_THRESHOLD).toBe(10);
	});
	it('POPULAR_SETUP_THRESHOLD is 10', () => {
		expect(POPULAR_SETUP_THRESHOLD).toBe(10);
	});
	it('AGGREGATION_WINDOW_MS is 24 hours', () => {
		expect(AGGREGATION_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
	});
});

describe('scoreItem', () => {
	const now = new Date('2026-04-19T12:00:00Z');
	const base: ScorableItem = {
		createdAt: now,
		bucket: 'own',
		actorFollowersCount: 0,
		setupStarsCount: 0
	};

	it('own scores higher than follows at equal recency', () => {
		const ownScore = scoreItem({ ...base, bucket: 'own' }, now);
		const followsScore = scoreItem({ ...base, bucket: 'follows' }, now);
		expect(ownScore).toBeGreaterThan(followsScore);
	});

	it('follows scores higher than popular at equal recency', () => {
		const followsScore = scoreItem({ ...base, bucket: 'follows' }, now);
		const popularScore = scoreItem({ ...base, bucket: 'popular' }, now);
		expect(followsScore).toBeGreaterThan(popularScore);
	});

	it('recency decay: newer items score higher than older items in the same bucket', () => {
		const fresh = scoreItem({ ...base, createdAt: now }, now);
		const oneDayOld = scoreItem(
			{ ...base, createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
			now
		);
		expect(fresh).toBeGreaterThan(oneDayOld);
	});

	it('10-min follow item beats a 7-day popular item', () => {
		const freshFollow = scoreItem(
			{
				...base,
				bucket: 'follows',
				createdAt: new Date(now.getTime() - 10 * 60 * 1000)
			},
			now
		);
		const oldPopular = scoreItem(
			{
				...base,
				bucket: 'popular',
				createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
				actorFollowersCount: 500,
				setupStarsCount: 500
			},
			now
		);
		expect(freshFollow).toBeGreaterThan(oldPopular);
	});

	it('popularity_boost nudges higher-popularity items up within the same bucket', () => {
		const low = scoreItem({ ...base, actorFollowersCount: 0, setupStarsCount: 0 }, now);
		const high = scoreItem({ ...base, actorFollowersCount: 500, setupStarsCount: 500 }, now);
		expect(high).toBeGreaterThan(low);
	});
});

describe('aggregateStarredItems', () => {
	const now = new Date('2026-04-19T12:00:00Z');
	const mk = (overrides: Partial<AggregatableItem>): AggregatableItem => ({
		id: crypto.randomUUID(),
		actionType: 'starred_setup',
		createdAt: now,
		setupId: 'setup-1',
		actorUsername: 'alice',
		actorAvatarUrl: 'https://example.com/a.png',
		score: 1,
		...overrides
	});

	it('aggregates same-setup starred_setup events within 24h into one row', () => {
		const items = [
			mk({ actorUsername: 'alice', score: 0.9 }),
			mk({ actorUsername: 'bob', score: 0.8 }),
			mk({ actorUsername: 'carol', score: 0.7 })
		];
		const result = aggregateStarredItems(items);
		expect(result).toHaveLength(1);
		expect(result[0].aggregatedCount).toBe(3);
		expect(result[0].aggregatedActors).toHaveLength(2);
		expect(result[0].aggregatedActors?.map((a) => a.username)).toEqual(['alice', 'bob']);
	});

	it('keeps the highest-scored row as the representative', () => {
		const winner = mk({ id: 'winner', actorUsername: 'alice', score: 0.9 });
		const loser = mk({ id: 'loser', actorUsername: 'bob', score: 0.5 });
		const result = aggregateStarredItems([loser, winner]);
		expect(result[0].id).toBe('winner');
	});

	it('does NOT aggregate starred_setup events older than 24h apart', () => {
		const items = [
			mk({ actorUsername: 'alice', createdAt: now }),
			mk({
				actorUsername: 'bob',
				createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000)
			})
		];
		const result = aggregateStarredItems(items);
		expect(result).toHaveLength(2);
	});

	it('does NOT aggregate non-starred_setup events', () => {
		const items = [
			mk({ actionType: 'commented', actorUsername: 'alice' }),
			mk({ actionType: 'commented', actorUsername: 'bob' })
		];
		const result = aggregateStarredItems(items);
		expect(result).toHaveLength(2);
	});

	it('does NOT aggregate starred_setup events across different setups', () => {
		const items = [
			mk({ setupId: 's1', actorUsername: 'alice' }),
			mk({ setupId: 's2', actorUsername: 'bob' })
		];
		const result = aggregateStarredItems(items);
		expect(result).toHaveLength(2);
	});

	it('returns items unchanged when nothing to aggregate', () => {
		const items = [mk({ actorUsername: 'alice' })];
		const result = aggregateStarredItems(items);
		expect(result).toHaveLength(1);
		expect(result[0].aggregatedCount).toBeUndefined();
		expect(result[0].aggregatedActors).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test:unit --run src/lib/server/queries/activityFeed.logic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `activityFeed.logic.ts`**

Create `src/lib/server/queries/activityFeed.logic.ts`:

```typescript
export const BUCKET_WEIGHTS = {
	own: 1.0,
	follows: 0.9,
	popular: 0.3
} as const;

export const POPULAR_ACTOR_THRESHOLD = 10;
export const POPULAR_SETUP_THRESHOLD = 10;
export const AGGREGATION_WINDOW_MS = 24 * 60 * 60 * 1000;

const RECENCY_HALF_LIFE_HOURS = 48;
const POPULARITY_COEFFICIENT = 0.1;

export type Bucket = keyof typeof BUCKET_WEIGHTS;

export type ScorableItem = {
	createdAt: Date;
	bucket: Bucket;
	actorFollowersCount: number;
	setupStarsCount: number;
};

export function scoreItem(item: ScorableItem, now: Date): number {
	const hoursSince = (now.getTime() - item.createdAt.getTime()) / (60 * 60 * 1000);
	const recencyDecay = Math.exp(-hoursSince / RECENCY_HALF_LIFE_HOURS);
	const popularityBoost =
		1 + POPULARITY_COEFFICIENT * Math.log(item.actorFollowersCount + item.setupStarsCount + 1);
	return BUCKET_WEIGHTS[item.bucket] * recencyDecay * popularityBoost;
}

export type AggregatableItem = {
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

export function aggregateStarredItems<T extends AggregatableItem>(items: T[]): T[] {
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
		// Key by setupId + 24h window bucket based on representative's createdAt
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/server/queries/activityFeed.logic.test.ts`
Expected: PASS — all 13 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/queries/activityFeed.logic.ts src/lib/server/queries/activityFeed.logic.test.ts
git commit -m "feat(queries): add pure scoring and aggregation helpers for activity feed"
```

---

## Task 2: Extend FeedItem type

**Files:**

- Modify: `src/lib/server/queries/activities.ts`

- [ ] **Step 1: Add the four optional fields to `FeedItem`**

In `src/lib/server/queries/activities.ts`, extend the `FeedItem` type. Find the type definition around line 12 and add the new optional fields at the end:

```typescript
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
	// New: blended activity feed fields. Undefined = legacy behavior.
	isPopular?: boolean;
	isOwnActivity?: boolean;
	aggregatedActors?: { username: string; avatarUrl: string }[];
	aggregatedCount?: number;
};
```

- [ ] **Step 2: Run type-check**

Run: `pnpm check`
Expected: PASS — no errors. (Other callers reading `FeedItem` remain compatible because fields are optional.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/queries/activities.ts
git commit -m "refactor(queries): extend FeedItem with blended-feed fields"
```

---

## Task 3: Implement `getBlendedActivityFeed` query

**Files:**

- Create: `src/lib/server/queries/activityFeed.ts`
- Create: `src/lib/server/queries/activityFeed.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/queries/activityFeed.test.ts`. Use the hoisted-mock pattern from `activities.test.ts` but parameterize the mock per query-call so three parallel bucket queries return different row sets.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, unknown>;

// Hoisted state: each .limit() call pops the next row set.
const state = vi.hoisted(() => ({
	rowSets: [] as Row[][],
	callIndex: 0
}));

vi.mock('drizzle-orm', () => {
	function sqlFn(strings: TemplateStringsArray, ...values: unknown[]) {
		return { _type: 'sql', strings: Array.from(strings), values };
	}
	return {
		and: vi.fn((...args: unknown[]) => ({ _type: 'and', args })),
		desc: vi.fn((col: unknown) => ({ _type: 'desc', col })),
		eq: vi.fn((a: unknown, b: unknown) => ({ _type: 'eq', a, b })),
		gte: vi.fn((a: unknown, b: unknown) => ({ _type: 'gte', a, b })),
		inArray: vi.fn((col: unknown, arr: unknown) => ({ _type: 'inArray', col, arr })),
		lt: vi.fn((a: unknown, b: unknown) => ({ _type: 'lt', a, b })),
		ne: vi.fn((a: unknown, b: unknown) => ({ _type: 'ne', a, b })),
		or: vi.fn((...args: unknown[]) => ({ _type: 'or', args })),
		sql: sqlFn
	};
});

vi.mock('drizzle-orm/pg-core', () => ({ alias: vi.fn(() => ({})) }));

vi.mock('$lib/server/db/schema', () => ({
	activities: {
		id: 'activities.id',
		actionType: 'activities.actionType',
		createdAt: 'activities.createdAt',
		userId: 'activities.userId',
		setupId: 'activities.setupId',
		targetUserId: 'activities.targetUserId',
		commentId: 'activities.commentId',
		teamId: 'activities.teamId'
	},
	comments: { id: 'comments.id', body: 'comments.body' },
	follows: { followerId: 'follows.followerId', followingId: 'follows.followingId' },
	setups: {
		id: 'setups.id',
		userId: 'setups.userId',
		name: 'setups.name',
		slug: 'setups.slug',
		visibility: 'setups.visibility',
		teamId: 'setups.teamId',
		starsCount: 'setups.starsCount'
	},
	teams: {
		id: 'teams.id',
		name: 'teams.name',
		slug: 'teams.slug',
		avatarUrl: 'teams.avatarUrl'
	},
	teamMembers: {
		teamId: 'team_members.team_id',
		userId: 'team_members.user_id'
	},
	users: {
		id: 'users.id',
		username: 'users.username',
		avatarUrl: 'users.avatarUrl',
		followersCount: 'users.followersCount'
	}
}));

vi.mock('$lib/server/db', () => {
	const chain: Record<string, unknown> = {};
	const methods = ['select', 'from', 'innerJoin', 'leftJoin', 'where', 'orderBy'];
	for (const m of methods) {
		chain[m] = vi.fn(() => chain);
	}
	chain['limit'] = vi.fn(() => {
		const next = state.rowSets[state.callIndex] ?? [];
		state.callIndex += 1;
		return Promise.resolve(next);
	});
	return { db: chain };
});

import { getBlendedActivityFeed } from './activityFeed';

function row(overrides: Partial<Row> = {}): Row {
	return {
		id: crypto.randomUUID(),
		actionType: 'created_setup',
		createdAt: new Date('2026-04-19T12:00:00Z'),
		actorUsername: 'alice',
		actorAvatarUrl: 'https://example.com/alice.png',
		setupId: 'setup-1',
		setupName: 'My Setup',
		setupSlug: 'my-setup',
		setupOwnerUsername: 'alice',
		targetUserId: null,
		targetUsername: null,
		targetAvatarUrl: null,
		commentId: null,
		commentBody: null,
		teamId: null,
		teamName: null,
		teamSlug: null,
		teamAvatarUrl: null,
		actorFollowersCount: 0,
		setupStarsCount: 0,
		viewerTeamMembershipTeamIds: [],
		...overrides
	};
}

describe('getBlendedActivityFeed', () => {
	beforeEach(() => {
		state.rowSets = [];
		state.callIndex = 0;
		vi.clearAllMocks();
	});

	it('returns empty items when all three buckets are empty', async () => {
		state.rowSets = [[], [], [], []]; // own, follows, popular, team_memberships
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items).toEqual([]);
	});

	it('fills up to limit from all three buckets', async () => {
		state.rowSets = [
			[row({ id: 'o1', actorUsername: 'viewer' })], // own
			[row({ id: 'f1', actorUsername: 'alice' }), row({ id: 'f2', actorUsername: 'bob' })], // follows
			[row({ id: 'p1', actorUsername: 'eve', actorFollowersCount: 500 })], // popular
			[] // team memberships
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		const ids = result.items.map((i) => i.id).sort();
		expect(ids).toEqual(['f1', 'f2', 'o1', 'p1']);
	});

	it('marks own-bucket items with isOwnActivity true', async () => {
		state.rowSets = [[row({ id: 'o1', actorUsername: 'viewer' })], [], [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items[0].isOwnActivity).toBe(true);
	});

	it('marks popular-bucket items with isPopular true', async () => {
		state.rowSets = [[], [], [row({ id: 'p1', actorFollowersCount: 500 })], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items[0].isPopular).toBe(true);
	});

	it('weights own above follows on equal recency', async () => {
		const sameTime = new Date('2026-04-19T12:00:00Z');
		state.rowSets = [
			[row({ id: 'own', createdAt: sameTime, actorUsername: 'viewer' })],
			[row({ id: 'follow', createdAt: sameTime, actorUsername: 'alice' })],
			[],
			[]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items[0].id).toBe('own');
		expect(result.items[1].id).toBe('follow');
	});

	it('aggregates same-setup starred_setup follows within 24h', async () => {
		const now = new Date('2026-04-19T12:00:00Z');
		state.rowSets = [
			[],
			[
				row({
					id: 's1',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					actorUsername: 'alice',
					createdAt: now
				}),
				row({
					id: 's2',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					actorUsername: 'bob',
					createdAt: new Date(now.getTime() - 60 * 60 * 1000)
				}),
				row({
					id: 's3',
					actionType: 'starred_setup',
					setupId: 'setup-x',
					actorUsername: 'carol',
					createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
				})
			],
			[],
			[]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		const starredItems = result.items.filter((i) => i.actionType === 'starred_setup');
		expect(starredItems).toHaveLength(1);
		expect(starredItems[0].aggregatedCount).toBe(3);
		expect(starredItems[0].aggregatedActors).toHaveLength(2);
	});

	it('hides team events when viewer is not a member of that team', async () => {
		state.rowSets = [
			[],
			[row({ id: 'team-ev', actionType: 'joined_team', teamId: 'team-x', actorUsername: 'alice' })],
			[],
			[] // empty memberships
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items.find((i) => i.actionType === 'joined_team')).toBeUndefined();
	});

	it('shows team events when viewer IS a member', async () => {
		state.rowSets = [
			[],
			[row({ id: 'team-ev', actionType: 'joined_team', teamId: 'team-x', actorUsername: 'alice' })],
			[],
			[{ teamId: 'team-x' }]
		];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items.find((i) => i.id === 'team-ev')).toBeDefined();
	});

	it('returns a nextCursor when there are more rows than limit', async () => {
		const rows = Array.from({ length: 12 }, (_, i) =>
			row({
				id: `r${i}`,
				createdAt: new Date(new Date('2026-04-19T12:00:00Z').getTime() - i * 60_000)
			})
		);
		state.rowSets = [[], rows, [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.items).toHaveLength(8);
		expect(result.nextCursor).not.toBeNull();
	});

	it('returns null nextCursor when total items ≤ limit', async () => {
		state.rowSets = [[row({ id: 'o1', actorUsername: 'viewer' })], [], [], []];
		const result = await getBlendedActivityFeed('viewer-1', undefined, 8);
		expect(result.nextCursor).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test:unit --run src/lib/server/queries/activityFeed.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `activityFeed.ts`**

Create `src/lib/server/queries/activityFeed.ts`:

```typescript
import { and, desc, eq, gte, inArray, lt, ne, or, sql, type SQL } from 'drizzle-orm';
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
import {
	BUCKET_WEIGHTS,
	POPULAR_ACTOR_THRESHOLD,
	POPULAR_SETUP_THRESHOLD,
	aggregateStarredItems,
	scoreItem,
	type Bucket
} from './activityFeed.logic';

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
	actorFollowersCount: number;
	setupStarsCount: number;
};

function baseSelect() {
	return db
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
		sql`${activities.userId} NOT IN (${followingSub})`,
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

export async function getBlendedActivityFeed(
	viewerId: string,
	cursor: Date | undefined,
	limit: number
): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
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

	// Aggregate starred_setup within 24h on same setup
	const aggregatable = gated.map((r) => ({
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
			isOwnActivity: r.bucket === 'own',
			aggregatedActors: t.aggregatedActors,
			aggregatedCount: t.aggregatedCount
		};
	});

	const hasMore = aggregated.length > limit;
	const nextCursor =
		hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

	return { items, nextCursor };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/server/queries/activityFeed.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Run type-check**

Run: `pnpm check`
Expected: PASS — no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/queries/activityFeed.ts src/lib/server/queries/activityFeed.test.ts
git commit -m "feat(queries): add getBlendedActivityFeed with bucket scoring and team gating"
```

---

## Task 4: Extract ActivityItem logic + tests

**Files:**

- Create: `src/lib/components/ActivityItem.logic.ts`
- Create: `src/lib/components/ActivityItem.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/ActivityItem.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
	resolveActorLabel,
	aggregatedActorsText,
	shouldShowPopularPill,
	shouldShowAvatarStack,
	shouldShowCommentPreview
} from './ActivityItem.logic';
import type { FeedItem } from '$lib/server/queries/activities';

const baseItem: FeedItem = {
	id: 'a',
	actionType: 'starred_setup',
	createdAt: new Date('2026-04-19T12:00:00Z'),
	actorUsername: 'alice',
	actorAvatarUrl: 'https://example.com/a.png',
	setupId: 's',
	setupName: 'My Setup',
	setupSlug: 'my-setup',
	setupOwnerUsername: 'alice',
	targetUserId: null,
	targetUsername: null,
	targetAvatarUrl: null,
	commentId: null,
	commentBody: null,
	teamId: null,
	teamName: null,
	teamSlug: null,
	teamAvatarUrl: null
};

describe('resolveActorLabel', () => {
	it('returns "You" when isOwnActivity is true', () => {
		expect(resolveActorLabel({ ...baseItem, isOwnActivity: true })).toBe('You');
	});

	it('returns @username when isOwnActivity is false', () => {
		expect(resolveActorLabel({ ...baseItem, isOwnActivity: false })).toBe('@alice');
	});

	it('returns @username when isOwnActivity is undefined', () => {
		expect(resolveActorLabel(baseItem)).toBe('@alice');
	});
});

describe('aggregatedActorsText', () => {
	it('returns null when no aggregation', () => {
		expect(aggregatedActorsText(baseItem)).toBeNull();
	});

	it('returns "alice and bob" for 2 aggregated actors', () => {
		expect(
			aggregatedActorsText({
				...baseItem,
				aggregatedActors: [
					{ username: 'alice', avatarUrl: '' },
					{ username: 'bob', avatarUrl: '' }
				],
				aggregatedCount: 2
			})
		).toBe('@alice, @bob');
	});

	it('returns "alice, bob and N others" when count > actors shown', () => {
		expect(
			aggregatedActorsText({
				...baseItem,
				aggregatedActors: [
					{ username: 'alice', avatarUrl: '' },
					{ username: 'bob', avatarUrl: '' }
				],
				aggregatedCount: 5
			})
		).toBe('@alice, @bob and 3 others');
	});
});

describe('shouldShowPopularPill', () => {
	it('true when isPopular is true', () => {
		expect(shouldShowPopularPill({ ...baseItem, isPopular: true })).toBe(true);
	});

	it('false when isPopular is false or undefined', () => {
		expect(shouldShowPopularPill({ ...baseItem, isPopular: false })).toBe(false);
		expect(shouldShowPopularPill(baseItem)).toBe(false);
	});
});

describe('shouldShowAvatarStack', () => {
	it('true when aggregatedActors.length >= 2', () => {
		expect(
			shouldShowAvatarStack({
				...baseItem,
				aggregatedActors: [
					{ username: 'a', avatarUrl: '' },
					{ username: 'b', avatarUrl: '' }
				]
			})
		).toBe(true);
	});

	it('false when aggregatedActors is undefined or has <2 entries', () => {
		expect(shouldShowAvatarStack(baseItem)).toBe(false);
		expect(
			shouldShowAvatarStack({
				...baseItem,
				aggregatedActors: [{ username: 'a', avatarUrl: '' }]
			})
		).toBe(false);
	});
});

describe('shouldShowCommentPreview', () => {
	it('true when actionType is commented and commentBody is non-empty', () => {
		expect(
			shouldShowCommentPreview({
				...baseItem,
				actionType: 'commented',
				commentBody: 'This is a comment'
			})
		).toBe(true);
	});

	it('false when actionType is not commented', () => {
		expect(
			shouldShowCommentPreview({
				...baseItem,
				actionType: 'starred_setup',
				commentBody: 'text'
			})
		).toBe(false);
	});

	it('false when commentBody is null or empty', () => {
		expect(
			shouldShowCommentPreview({
				...baseItem,
				actionType: 'commented',
				commentBody: null
			})
		).toBe(false);
		expect(
			shouldShowCommentPreview({
				...baseItem,
				actionType: 'commented',
				commentBody: ''
			})
		).toBe(false);
	});
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test:unit --run src/lib/components/ActivityItem.test.ts`
Expected: FAIL — module `./ActivityItem.logic` not found.

- [ ] **Step 3: Implement `ActivityItem.logic.ts`**

Create `src/lib/components/ActivityItem.logic.ts`:

```typescript
import type { FeedItem } from '$lib/server/queries/activities';

export function resolveActorLabel(item: FeedItem): string {
	return item.isOwnActivity ? 'You' : `@${item.actorUsername}`;
}

export function aggregatedActorsText(item: FeedItem): string | null {
	const actors = item.aggregatedActors;
	const count = item.aggregatedCount;
	if (!actors || actors.length === 0 || !count) return null;
	const names = actors.map((a) => `@${a.username}`).join(', ');
	if (count > actors.length) {
		const extra = count - actors.length;
		return `${names} and ${extra} other${extra === 1 ? '' : 's'}`;
	}
	return names;
}

export function shouldShowPopularPill(item: FeedItem): boolean {
	return item.isPopular === true;
}

export function shouldShowAvatarStack(item: FeedItem): boolean {
	return (item.aggregatedActors?.length ?? 0) >= 2;
}

export function shouldShowCommentPreview(item: FeedItem): boolean {
	return item.actionType === 'commented' && !!item.commentBody && item.commentBody.length > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/components/ActivityItem.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ActivityItem.logic.ts src/lib/components/ActivityItem.test.ts
git commit -m "feat(components): add pure helpers for ActivityItem blended-feed rendering"
```

---

## Task 5: Wire new rendering into `ActivityItem.svelte`

**Files:**

- Modify: `src/lib/components/ActivityItem.svelte`

- [ ] **Step 1: Rewrite the component to use the new helpers + extra rendering**

Replace the full contents of `src/lib/components/ActivityItem.svelte` with:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { timeAgo } from '$lib/utils';
	import type { FeedItem } from '$lib/server/queries/activities';
	import {
		resolveActorLabel,
		aggregatedActorsText,
		shouldShowPopularPill,
		shouldShowAvatarStack,
		shouldShowCommentPreview
	} from './ActivityItem.logic';

	type Props = { item: FeedItem };
	const { item }: Props = $props();

	let tick = $state(0);
	const relativeTime = $derived.by(() => {
		void tick;
		return timeAgo(item.createdAt);
	});

	onMount(() => {
		const interval = setInterval(() => {
			tick++;
		}, 60_000);
		return () => clearInterval(interval);
	});

	const setupHref = $derived(
		item.setupOwnerUsername && item.setupSlug
			? `/${item.setupOwnerUsername}/${item.setupSlug}`
			: null
	);
	const commentHref = $derived(
		setupHref && item.commentId ? `${setupHref}#comment-${item.commentId}` : setupHref
	);
	const teamHref = $derived(item.teamSlug ? `/teams/${item.teamSlug}` : null);
	const actorLabel = $derived(resolveActorLabel(item));
	const actorHref = $derived(
		item.isOwnActivity ? `/${item.actorUsername}` : `/${item.actorUsername}`
	);
	const aggText = $derived(aggregatedActorsText(item));
	const showPill = $derived(shouldShowPopularPill(item));
	const showStack = $derived(shouldShowAvatarStack(item));
	const showPreview = $derived(shouldShowCommentPreview(item));
</script>

<div class="flex gap-3 py-3" data-testid="activity-item">
	{#if showStack && item.aggregatedActors}
		<div class="flex shrink-0">
			<Avatar class="size-9 text-xs">
				<AvatarImage
					src={item.aggregatedActors[0].avatarUrl}
					alt={item.aggregatedActors[0].username}
				/>
				<AvatarFallback>{item.aggregatedActors[0].username[0].toUpperCase()}</AvatarFallback>
			</Avatar>
			<Avatar class="-ml-3 size-9 border-2 border-background text-xs">
				<AvatarImage
					src={item.aggregatedActors[1].avatarUrl}
					alt={item.aggregatedActors[1].username}
				/>
				<AvatarFallback>{item.aggregatedActors[1].username[0].toUpperCase()}</AvatarFallback>
			</Avatar>
		</div>
	{:else}
		<a href={actorHref} class="shrink-0">
			<Avatar class="size-9 text-xs">
				<AvatarImage src={item.actorAvatarUrl} alt={item.actorUsername} />
				<AvatarFallback>{item.actorUsername[0].toUpperCase()}</AvatarFallback>
			</Avatar>
		</a>
	{/if}

	<div class="min-w-0 flex-1">
		<p class="text-sm leading-snug text-foreground">
			{#if aggText}
				<span class="font-semibold">{aggText}</span>
			{:else}
				<a href={actorHref} class="font-semibold hover:underline">{actorLabel}</a>
			{/if}

			{#if item.actionType === 'created_setup'}
				published
				{#if setupHref}
					<a href={setupHref} class="font-medium hover:underline">{item.setupName}</a>
				{:else}
					a setup
				{/if}
			{:else if item.actionType === 'commented'}
				commented on
				{#if commentHref && item.setupName}
					<a href={commentHref} class="font-medium hover:underline">{item.setupName}</a>
				{:else if setupHref && item.setupName}
					<a href={setupHref} class="font-medium hover:underline">{item.setupName}</a>
				{:else}
					a setup
				{/if}
			{:else if item.actionType === 'followed_user'}
				followed
				{#if item.targetUsername}
					<a href="/{item.targetUsername}" class="font-medium hover:underline"
						>@{item.targetUsername}</a
					>
				{:else}
					a user
				{/if}
			{:else if item.actionType === 'starred_setup'}
				starred
				{#if setupHref}
					<a href={setupHref} class="font-medium hover:underline">{item.setupName}</a>
				{:else}
					a setup
				{/if}
			{:else if item.actionType === 'created_team'}
				created team
				{#if teamHref}
					<a href={teamHref} class="font-medium hover:underline">{item.teamName}</a>
				{:else}
					a team
				{/if}
			{:else if item.actionType === 'joined_team'}
				joined team
				{#if teamHref}
					<a href={teamHref} class="font-medium hover:underline">{item.teamName}</a>
				{:else}
					a team
				{/if}
			{:else if item.actionType === 'left_team'}
				left team
				{#if teamHref}
					<a href={teamHref} class="font-medium hover:underline">{item.teamName}</a>
				{:else}
					a team
				{/if}
			{:else if item.actionType === 'invited_to_team'}
				invited
				{#if item.targetUsername}
					<a href="/{item.targetUsername}" class="font-medium hover:underline"
						>@{item.targetUsername}</a
					>
				{:else}
					someone
				{/if}
				to
				{#if teamHref}
					<a href={teamHref} class="font-medium hover:underline">{item.teamName}</a>
				{:else}
					a team
				{/if}
			{/if}

			{#if showPill}
				<span
					class="ml-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary"
					data-testid="popular-pill">popular</span
				>
			{/if}
		</p>

		{#if showPreview}
			<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
				{item.commentBody}
			</p>
		{/if}

		<p class="mt-1 text-xs text-muted-foreground" data-testid="activity-timestamp">
			{relativeTime}
		</p>
	</div>
</div>
```

- [ ] **Step 2: Run type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Run unit tests**

Run: `pnpm test:unit --run src/lib/components/ActivityItem.test.ts src/lib/server/queries/activityFeed.test.ts`
Expected: PASS — tests written in Task 4 & Task 3 still green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ActivityItem.svelte
git commit -m "feat(components): render You voice, popular pill, avatar stack, team events in ActivityItem"
```

---

## Task 6: Create `ActivityPanel.svelte` wrapper + pure tests

**Files:**

- Create: `src/lib/components/ActivityPanel.svelte`
- Create: `src/lib/components/ActivityPanel.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/components/ActivityPanel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
	resolveEmptyState,
	shouldShowFollowCta,
	DISMISS_KEY,
	type EmptyState
} from './ActivityPanel.logic';
import type { FeedItem } from '$lib/server/queries/activities';

const item = (overrides: Partial<FeedItem> = {}): FeedItem => ({
	id: 'a',
	actionType: 'created_setup',
	createdAt: new Date(),
	actorUsername: 'alice',
	actorAvatarUrl: '',
	setupId: 's',
	setupName: 'My Setup',
	setupSlug: 'my-setup',
	setupOwnerUsername: 'alice',
	targetUserId: null,
	targetUsername: null,
	targetAvatarUrl: null,
	commentId: null,
	commentBody: null,
	teamId: null,
	teamName: null,
	teamSlug: null,
	teamAvatarUrl: null,
	...overrides
});

describe('resolveEmptyState', () => {
	it('returns "none" when items has at least one entry', () => {
		expect(resolveEmptyState([item()])).toBe<EmptyState>('none');
	});
	it('returns "zero" when items is empty', () => {
		expect(resolveEmptyState([])).toBe<EmptyState>('zero');
	});
});

describe('shouldShowFollowCta', () => {
	it('true when every item is isPopular and banner not dismissed', () => {
		const items = [item({ isPopular: true }), item({ id: 'b', isPopular: true })];
		expect(shouldShowFollowCta(items, false)).toBe(true);
	});

	it('false when some items are not popular', () => {
		const items = [item({ isPopular: true }), item({ id: 'b', isPopular: false })];
		expect(shouldShowFollowCta(items, false)).toBe(false);
	});

	it('false when banner is dismissed', () => {
		const items = [item({ isPopular: true })];
		expect(shouldShowFollowCta(items, true)).toBe(false);
	});

	it('false when items is empty', () => {
		expect(shouldShowFollowCta([], false)).toBe(false);
	});
});

describe('DISMISS_KEY', () => {
	it('uses a namespaced localStorage key', () => {
		expect(DISMISS_KEY).toBe('activity-follow-cta-dismissed');
	});
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test:unit --run src/lib/components/ActivityPanel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `ActivityPanel.logic.ts`**

Create `src/lib/components/ActivityPanel.logic.ts`:

```typescript
import type { FeedItem } from '$lib/server/queries/activities';

export const DISMISS_KEY = 'activity-follow-cta-dismissed';

export type EmptyState = 'none' | 'zero';

export function resolveEmptyState(items: FeedItem[]): EmptyState {
	return items.length === 0 ? 'zero' : 'none';
}

export function shouldShowFollowCta(items: FeedItem[], dismissed: boolean): boolean {
	if (dismissed) return false;
	if (items.length === 0) return false;
	return items.every((i) => i.isPopular === true);
}
```

- [ ] **Step 4: Create `ActivityPanel.svelte`**

Create `src/lib/components/ActivityPanel.svelte`:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import ActivityFeed from './ActivityFeed.svelte';
	import { resolveEmptyState, shouldShowFollowCta, DISMISS_KEY } from './ActivityPanel.logic';
	import type { FeedItem } from '$lib/server/queries/activities';

	type Props = {
		items: FeedItem[];
	};
	const { items }: Props = $props();

	let dismissed = $state(false);

	onMount(() => {
		try {
			dismissed = localStorage.getItem(DISMISS_KEY) === '1';
		} catch {
			dismissed = false;
		}
	});

	function dismissCta() {
		dismissed = true;
		try {
			localStorage.setItem(DISMISS_KEY, '1');
		} catch {
			/* ignore quota / privacy mode */
		}
	}

	const emptyState = $derived(resolveEmptyState(items));
	const showCta = $derived(shouldShowFollowCta(items, dismissed));
</script>

<section data-testid="activity-panel">
	<div class="mb-3">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity</h2>
	</div>

	{#if showCta}
		<div
			class="mb-3 flex items-start justify-between gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs"
			data-testid="follow-cta"
		>
			<span>
				Follow people to personalize your feed
				<a href="/explore" class="ml-1 font-medium underline">→</a>
			</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground"
				onclick={dismissCta}
				aria-label="Dismiss">×</button
			>
		</div>
	{/if}

	{#if emptyState === 'zero'}
		<div class="rounded-md border border-dashed border-border px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">No activity yet.</p>
			<a href="/explore" class="mt-2 inline-block text-xs font-medium underline"
				>Follow people to see what they're up to →</a
			>
		</div>
	{:else}
		<ActivityFeed {items} emptyMessage="No recent activity." paginationEndpoint="/api/v1/feed" />
	{/if}

	{#if emptyState === 'none'}
		<div class="mt-4 flex justify-end">
			<a
				href="/feed"
				class={buttonVariants({ variant: 'ghost', size: 'sm' })}
				data-testid="see-all-link">See all →</a
			>
		</div>
	{/if}
</section>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test:unit --run src/lib/components/ActivityPanel.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ActivityPanel.svelte src/lib/components/ActivityPanel.logic.ts src/lib/components/ActivityPanel.test.ts
git commit -m "feat(components): add ActivityPanel wrapper with follow CTA and empty states"
```

---

## Task 7: Wire home page to new query + panel

**Files:**

- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Update `+page.server.ts`**

In `src/routes/+page.server.ts`:

1. Remove the import `getActivityOnUserSetups, type SetupActivityEntry` from `$lib/server/queries/activities`.
2. Add `import { getBlendedActivityFeed } from '$lib/server/queries/activityFeed';`.
3. In the `Promise.all` array, replace `getActivityOnUserSetups(viewerId)` with `getBlendedActivityFeed(viewerId, undefined, 8)`.
4. Replace the destructured `yourActivity` with `blendedActivity`.
5. In the returned object, change `yourActivity` to `activityFeed: blendedActivity.items` (the `.items` unwrap is important).
6. In the unauthenticated return at the bottom, change `yourActivity: [] as SetupActivityEntry[]` to `activityFeed: [] as import('$lib/server/queries/activities').FeedItem[]`.

Resulting full file:

```typescript
import type { PageServerLoad } from './$types';
import {
	getFeaturedSetups,
	getAgentsForSetups,
	getTrendingSetups,
	getForYouSetups,
	getSetupsFromFollowedUsers,
	searchSetups
} from '$lib/server/queries/setups';
import {
	getUserAggregateStats,
	getUserSetups,
	getUserSetupAgents
} from '$lib/server/queries/users';
import { getUserTeams } from '$lib/server/queries/teams';
import { getBlendedActivityFeed } from '$lib/server/queries/activityFeed';
import type { FeedItem } from '$lib/server/queries/activities';

type DashboardSetup = {
	id: string;
	name: string;
	slug: string;
	description: string;
	display?: string | null;
	starsCount: number;
	clonesCount: number;
	updatedAt: Date;
	ownerUsername: string;
	ownerAvatarUrl: string | undefined;
	agents: { id: string; displayName: string; slug: string }[];
};

const VALID_TABS = ['for-you', 'following', 'trending'] as const;
type Tab = (typeof VALID_TABS)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const viewerId = locals.user.id;
		const rawTab = url.searchParams.get('tab');
		const activeTab: Tab = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
			? (rawTab as Tab)
			: 'for-you';

		const [
			featured,
			userStats,
			userSetups,
			userAgents,
			userTeams,
			trending,
			blendedActivity,
			forYou,
			following
		] = await Promise.all([
			getFeaturedSetups(3, viewerId),
			getUserAggregateStats(viewerId),
			getUserSetups(viewerId, 5),
			getUserSetupAgents(viewerId),
			getUserTeams(viewerId),
			getTrendingSetups(6, viewerId),
			getBlendedActivityFeed(viewerId, undefined, 8),
			getForYouSetups(viewerId, 6),
			getSetupsFromFollowedUsers(viewerId, 6)
		]);

		const featuredIds = featured.map((s) => s.id);
		const dashboardAgentsMap = featuredIds.length > 0 ? await getAgentsForSetups(featuredIds) : {};

		const toCard = (s: {
			id: string;
			name: string;
			slug: string;
			description: string;
			display?: string | null;
			starsCount: number;
			clonesCount: number;
			updatedAt: Date;
			ownerUsername: string;
			ownerAvatarUrl: string | null;
		}): DashboardSetup => ({
			id: s.id,
			name: s.name,
			slug: s.slug,
			description: s.description,
			display: s.display,
			starsCount: s.starsCount,
			clonesCount: s.clonesCount,
			updatedAt: s.updatedAt,
			ownerUsername: s.ownerUsername,
			ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
			agents: dashboardAgentsMap[s.id] ?? []
		});

		return {
			user: locals.user,
			featuredSetups: featured.map(toCard),
			activityFeed: blendedActivity.items,
			trendingSetups: trending.map(
				(s): DashboardSetup => ({
					id: s.id,
					name: s.name,
					slug: s.slug,
					description: s.description,
					display: s.display,
					starsCount: s.starsCount,
					clonesCount: s.clonesCount,
					updatedAt: s.updatedAt,
					ownerUsername: s.ownerUsername,
					ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
					agents: []
				})
			),
			forYouSetups: forYou.map(
				(s): DashboardSetup => ({
					id: s.id,
					name: s.name,
					slug: s.slug,
					description: s.description,
					display: s.display,
					starsCount: s.starsCount,
					clonesCount: s.clonesCount,
					updatedAt: s.updatedAt,
					ownerUsername: s.ownerUsername,
					ownerAvatarUrl: s.ownerAvatarUrl || undefined,
					agents: s.agents
				})
			),
			followingSetups: following.map(
				(s): DashboardSetup => ({
					id: s.id,
					name: s.name,
					slug: s.slug,
					description: s.description,
					display: s.display,
					starsCount: s.starsCount,
					clonesCount: s.clonesCount,
					updatedAt: s.updatedAt,
					ownerUsername: s.ownerUsername,
					ownerAvatarUrl: s.ownerAvatarUrl || undefined,
					agents: s.agents
				})
			),
			activeTab,
			userStats,
			userSetups,
			userAgents,
			userTeams: userTeams.map((t) => ({
				id: t.id,
				name: t.name,
				slug: t.slug,
				avatarUrl: t.avatarUrl
			}))
		};
	}

	const results = await searchSetups({ sort: 'trending', page: 1, viewerId: undefined });
	const setupIds = results.items.slice(0, 6).map((s) => s.id);
	const agentsMap = await getAgentsForSetups(setupIds);

	return {
		user: null,
		featuredSetups: [] as DashboardSetup[],
		trendingSetups: results.items.slice(0, 6).map(
			(s): DashboardSetup => ({
				id: s.id,
				name: s.name,
				slug: s.slug,
				description: s.description,
				display: s.display,
				starsCount: s.starsCount,
				clonesCount: s.clonesCount,
				updatedAt: s.updatedAt,
				ownerUsername: s.ownerUsername,
				ownerAvatarUrl: s.ownerAvatarUrl ?? undefined,
				agents: agentsMap[s.id] ?? []
			})
		),
		forYouSetups: [] as DashboardSetup[],
		followingSetups: [] as DashboardSetup[],
		userStats: null,
		userSetups: [] as {
			id: string;
			name: string;
			slug: string;
			description: string;
			display: string | null | undefined;
			visibility: 'public' | 'private';
			starsCount: number;
			clonesCount: number;
			updatedAt: Date;
		}[],
		userAgents: [] as { id: string; slug: string; displayName: string }[],
		userTeams: [] as { id: string; name: string; slug: string; avatarUrl: string | null }[],
		activityFeed: [] as FeedItem[]
	};
};
```

- [ ] **Step 2: Update `+page.svelte`**

In `src/routes/+page.svelte`, replace the `YourActivityPanel` import and usage.

Replace the import line:

```svelte
import YourActivityPanel from '$lib/components/YourActivityPanel.svelte';
```

with:

```svelte
import ActivityPanel from '$lib/components/ActivityPanel.svelte';
```

Replace the block:

```svelte
{#if data.yourActivity.length > 0}
	<div class="order-8" data-testid="your-activity-panel">
		<YourActivityPanel activity={data.yourActivity} username={data.user.username} />
	</div>
{/if}
```

with:

```svelte
<div class="order-8" data-testid="activity-panel-slot">
	<ActivityPanel items={data.activityFeed} />
</div>
```

- [ ] **Step 3: Run type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Run unit tests**

Run: `pnpm test:unit --run`
Expected: PASS for everything except legacy `activityOnUserSetups.test.ts` (we'll delete that next task) and any dashboard tests that asserted `yourActivity` — update those to `activityFeed` if they exist.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.server.ts src/routes/+page.svelte
git commit -m "feat(home): swap notifications panel for blended ActivityPanel"
```

---

## Task 8: Wire `/feed` route + API

**Files:**

- Modify: `src/routes/(app)/feed/+page.server.ts`
- Modify: `src/routes/api/v1/feed/+server.ts`

- [ ] **Step 1: Update `/feed/+page.server.ts`**

Replace the full contents of `src/routes/(app)/feed/+page.server.ts` with:

```typescript
import type { PageServerLoad } from './$types';
import { getBlendedActivityFeed } from '$lib/server/queries/activityFeed';

export const load: PageServerLoad = async ({ locals }) => {
	const feed = await getBlendedActivityFeed(locals.user!.id, undefined, 20);
	return { feed };
};
```

- [ ] **Step 2: Update `api/v1/feed/+server.ts`**

Replace the full contents of `src/routes/api/v1/feed/+server.ts` with:

```typescript
import type { RequestHandler } from './$types';
import { requireApiAuth } from '$lib/server/guards';
import { success, error } from '$lib/server/responses';
import { getBlendedActivityFeed } from '$lib/server/queries/activityFeed';

export const GET: RequestHandler = async (event) => {
	const authResult = requireApiAuth(event);
	if (authResult instanceof Response) return authResult;
	const user = authResult;

	const cursorParam = event.url.searchParams.get('cursor');
	let cursor: Date | undefined;
	if (cursorParam) {
		const parsed = new Date(cursorParam);
		if (isNaN(parsed.getTime())) {
			return error('Invalid cursor value', 'INVALID_CURSOR', 400);
		}
		cursor = parsed;
	}

	const feed = await getBlendedActivityFeed(user.id, cursor, 20);
	return success(feed);
};
```

- [ ] **Step 3: Run type-check**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/\(app\)/feed/+page.server.ts src/routes/api/v1/feed/+server.ts
git commit -m "feat(feed): use getBlendedActivityFeed for /feed page and API"
```

---

## Task 9: Delete obsolete code + tests

**Files:**

- Delete: `src/lib/components/YourActivityPanel.svelte`
- Delete: `src/lib/server/queries/activityOnUserSetups.test.ts`
- Modify: `src/lib/server/queries/activities.ts`
- Modify: `src/lib/server/queries/activities.test.ts`

- [ ] **Step 1: Delete the old component**

Run: `rm src/lib/components/YourActivityPanel.svelte`

- [ ] **Step 2: Delete the old test file**

Run: `rm src/lib/server/queries/activityOnUserSetups.test.ts`

- [ ] **Step 3: Remove `getHomeFeed`, `getActivityOnUserSetups`, and `SetupActivityEntry` from `activities.ts`**

In `src/lib/server/queries/activities.ts`:

1. Delete the entire `getHomeFeed` function (the one that calls `queryFeed` with the following-filter).
2. Delete the entire `getActivityOnUserSetups` function.
3. Delete the entire `SetupActivityEntry` type export.
4. Keep: `FeedItem`, `queryFeed` (private helper), `getProfileFeed`, and the FEED_ACTION_TYPES / PROFILE_ACTION_TYPES constants.

If `gte` is no longer used, remove it from the `drizzle-orm` import. If `lt`, `inArray`, `ne`, etc. are still used by the remaining `queryFeed`/`getProfileFeed`, keep them.

- [ ] **Step 4: Remove any `getHomeFeed` tests from `activities.test.ts`**

Open `src/lib/server/queries/activities.test.ts`. Delete any `describe('getHomeFeed', ...)` block or individual `it(...)` tests that import or call `getHomeFeed`. Keep `getProfileFeed` coverage intact. Update the import line to remove `getHomeFeed`.

- [ ] **Step 5: Run type-check**

Run: `pnpm check`
Expected: PASS — no callers left for the deleted functions. (We confirmed earlier that `getHomeFeed` was only called by `/feed/+page.server.ts` and `/api/v1/feed/+server.ts`, both updated in Task 8; `getActivityOnUserSetups` was only called by `+page.server.ts`, updated in Task 7.)

- [ ] **Step 6: Run unit tests**

Run: `pnpm test:unit --run`
Expected: PASS — whole suite green.

- [ ] **Step 7: Commit**

```bash
git add -A src/lib/server/queries/activities.ts src/lib/server/queries/activities.test.ts
git add src/lib/components/YourActivityPanel.svelte src/lib/server/queries/activityOnUserSetups.test.ts
git commit -m "refactor: remove legacy YourActivityPanel, getActivityOnUserSetups, getHomeFeed"
```

(If `git add` complains about deleted files needing `-A` or `--all`, use `git add -A` at the relevant paths.)

---

## Task 10: Update e2e tests for the new panel

**Files:**

- Modify: `src/routes/page.svelte.e2e.ts`
- Create: `src/routes/(app)/feed/feed.e2e.ts` (if absent; may already exist — check first)

- [ ] **Step 1: Rename data-testid references + update empty-state assertion in `page.svelte.e2e.ts`**

In `src/routes/page.svelte.e2e.ts`:

Find and replace `your-activity-panel` → `activity-panel` throughout. Update the `happy path: activity panel shown` and `zero-state: YourActivityPanel absent` tests to assert against `activity-panel` and account for the new zero-state: instead of the panel being absent entirely, it should now be visible with either its `zero` empty-state ("No activity yet.") OR some items and/or the follow CTA (`data-testid="follow-cta"`).

Replace the existing `happy path: activity panel shown when user has recent activity` test with:

```typescript
test('happy path: activity panel visible when authenticated', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	await expect(page.getByTestId('activity-panel')).toBeVisible();
});
```

Replace the `zero-state: YourActivityPanel absent when user has no activity` test with:

```typescript
test('zero-state: activity panel renders zero empty state when no activity', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	if ((await page.getByTestId('your-setups-list').count()) > 0) {
		test.skip();
		return;
	}
	// Panel must be present; content could be zero empty-state, popular items, or follow CTA
	await expect(page.getByTestId('activity-panel')).toBeVisible();
});
```

Replace the `mobile: Featured Setups appears above YourActivityPanel` test's reference to `your-activity-panel` with `activity-panel`.

- [ ] **Step 2: Add Load more + See all link assertions**

Append to the "Logged-in happy path" section of `src/routes/page.svelte.e2e.ts`:

```typescript
test('happy path: activity panel shows See all link when there are items', async ({ page }) => {
	await page.goto(HOME);
	if (isAuthRedirect(page.url())) {
		test.skip();
		return;
	}
	const panel = page.getByTestId('activity-panel');
	await expect(panel).toBeVisible();
	const seeAll = panel.getByTestId('see-all-link');
	// See-all is only rendered when there are items (not in the zero empty state)
	if ((await seeAll.count()) > 0) {
		await expect(seeAll).toHaveAttribute('href', '/feed');
	}
});
```

- [ ] **Step 3: Run the e2e suite**

Run: `pnpm test:e2e -- --grep "activity"`
Expected: PASS. Tests that require auth will `test.skip()` without credentials — that's fine locally; CI supplies auth fixtures.

- [ ] **Step 4: Commit**

```bash
git add src/routes/page.svelte.e2e.ts
git commit -m "test(e2e): update home page tests for new ActivityPanel"
```

---

## Task 11: Visual verification (screenshots) + final checks

**Files:** no source changes; produces screenshots.

- [ ] **Step 1: Start the dev server in the background**

Run: `pnpm dev` (leave running in a separate terminal or use `run_in_background`).

- [ ] **Step 2: Capture desktop screenshot**

Run:

```bash
npx playwright screenshot --viewport-size=1280,720 http://localhost:5173/ screenshots/activity-panel-desktop.png
```

Expected: file written. Inspect visually.

- [ ] **Step 3: Capture mobile screenshot**

Run:

```bash
npx playwright screenshot --viewport-size=430,932 http://localhost:5173/ screenshots/activity-panel-mobile.png
```

Expected: file written. Inspect visually.

- [ ] **Step 4: Capture /feed page**

Run:

```bash
npx playwright screenshot --viewport-size=1280,720 http://localhost:5173/feed screenshots/feed-desktop.png
npx playwright screenshot --viewport-size=430,932 http://localhost:5173/feed screenshots/feed-mobile.png
```

- [ ] **Step 5: Review screenshots**

Read each file and confirm:

- ACTIVITY header reads `Activity` (uppercase styling via CSS)
- Aggregated stars show avatar stack + "@alice, @bob and N others" text
- Popular pill is soft mint (`bg-primary/10 text-primary`)
- Comment rows show 2-line clamp preview
- Footer shows `See all →` link; `Load more` appears if there are enough items
- Zero-state (if testable via a new-account fixture): banner CTA visible, dismissable
- Mobile: panel renders in right-column order within the mobile stack

Fix any visual regressions before proceeding.

- [ ] **Step 6: Run full CI checks**

Run: `pnpm ci:checks`
Expected: PASS — type-check, lint, unit tests all green.

- [ ] **Step 7: Commit (only if fixes were needed in Step 5)**

If you made visual fixes, commit them:

```bash
git add <fixed files>
git commit -m "fix(ui): visual polish for ActivityPanel"
```

Otherwise skip this step.

---

## Self-review checklist (to run after completing the plan)

- Every task step has a full code block — no "fill in the rest" placeholders.
- `FeedItem` additions in Task 2 match the fields consumed by `ActivityItem.svelte` (Task 5) and `ActivityPanel.svelte` (Task 6).
- Function names stay consistent across tasks: `scoreItem`, `aggregateStarredItems`, `getBlendedActivityFeed`, `resolveActorLabel`, `shouldShowPopularPill`, `shouldShowAvatarStack`, `shouldShowCommentPreview`, `resolveEmptyState`, `shouldShowFollowCta`.
- All spec requirements are covered:
  - Three buckets w/ weights ✅ (Task 1 + Task 3)
  - Action types (created*setup, starred_setup, commented, followed_user, team*\*) ✅ (Task 3 ACTIONS const + Task 5 Svelte template)
  - `cloned_setup` excluded ✅ (absent from ACTIONS)
  - Aggregation 24h window ✅ (Task 1 + Task 3)
  - Team member gating ✅ (Task 3 `fetchViewerTeamIds` + filter)
  - Private setup gating ✅ (Task 3 `visibilityClause`)
  - "You" voice ✅ (Task 4 + Task 5)
  - Popular pill soft mint ✅ (Task 5 classes)
  - Avatar stack ✅ (Task 5 template)
  - Comment preview 2-line clamp ✅ (Task 5 template)
  - Empty state + follow CTA + localStorage dismissal ✅ (Task 6)
  - Home panel 8 items, `/feed` 20 items ✅ (Task 7 + Task 8)
  - Load more + See all footer ✅ (Task 6 template)
  - `/feed` unified ✅ (Task 8)
  - Deletions ✅ (Task 9)
  - E2E ✅ (Task 10)
  - Screenshots ✅ (Task 11)
