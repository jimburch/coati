# Home Dashboard ACTIVITY Panel — Blended Feed Design

**Date:** 2026-04-19
**Status:** Design approved, awaiting implementation plan

## Summary

Replace the existing "YOUR ACTIVITY" notifications panel on the authenticated home dashboard with a new **ACTIVITY** panel — a single blended feed that mixes the viewer's own activity, activity from users they follow, and a lighter sprinkle of popular activity from across the platform. The `/feed` page adopts the same blended query for a unified experience.

## Motivation

The current `YourActivityPanel` surfaces aggregated stars and clones received _on the viewer's own setups_ in the last 7 days — essentially a notifications block. It's useful for setup owners but narrow in scope; it doesn't help the viewer discover what's happening in their network or across the platform. A blended activity feed expands the signal, surfaces social discovery, and makes the dashboard feel alive for viewers of every size (brand-new accounts included).

## Design Decisions

### Scope

- **Replace**, not augment. Delete `YourActivityPanel` and `getActivityOnUserSetups` entirely. The new panel occupies the same dashboard slot.
- **Unify with `/feed`.** The `/feed` page (currently follow-only) adopts the same blended query — just with a larger page size. One code path, one user mental model.

### Buckets and weights

Three candidate buckets merged via score-ranked selection:

| Bucket  | Source                                                                                                                                                                        | Weight |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Own     | `activities.user_id = viewerId`                                                                                                                                               | 1.0    |
| Follows | `activities.user_id IN (follows.followingId WHERE followerId = viewerId)`, excluding self                                                                                     | 0.9    |
| Popular | Actors with `followersCount >= POPULAR_ACTOR_THRESHOLD` OR activities on setups with `starsCount >= POPULAR_SETUP_THRESHOLD` — excluding own + follows to prevent duplication | 0.3    |

Initial thresholds: `POPULAR_ACTOR_THRESHOLD = 10`, `POPULAR_SETUP_THRESHOLD = 10`. Both are tunable constants in the query module and can be adjusted as the platform grows. Both rely on the denormalized `users.followersCount` and `setups.starsCount` columns (no runtime join-and-count).

Each candidate row gets a final score of:

```
score = bucket_weight × recency_decay × popularity_boost

recency_decay    = exp(-hours_since_created / 48)       // half-life ~33h
popularity_boost = 1 + 0.1 × log(actor_followers + setup_stars + 1)
```

Top N (8 on home, 20 on `/feed`) by `score DESC` then `createdAt DESC` as tiebreaker.

Weights are tunable constants in the query module.

### Action types included

| Action type       | Included | Notes                                                      |
| ----------------- | :------: | ---------------------------------------------------------- |
| `created_setup`   |    ✅    | Highest-value signal.                                      |
| `starred_setup`   |    ✅    | Aggregated within a 24h window per setup.                  |
| `commented`       |    ✅    | Renders with 2-line body preview.                          |
| `followed_user`   |    ✅    | Always-visible (no setup visibility dependency).           |
| `created_team`    |    ✅    | Team-member-gated.                                         |
| `joined_team`     |    ✅    | Team-member-gated.                                         |
| `left_team`       |    ✅    | Team-member-gated.                                         |
| `invited_to_team` |    ✅    | Team-member-gated.                                         |
| `cloned_setup`    |    ❌    | Too noisy — clones happen continuously and would dominate. |

### Visibility rules

- **Private setups:** setup-related events only visible to the owner or team members (matches existing `queryFeed` gating).
- **Team events:** only visible when the viewer is a member of the same team. Applies even when the actor is someone the viewer follows.
- **`followed_user` events:** always visible — no private dependency.

### Aggregation

Only `starred_setup` aggregates, and only within a 24h window keyed by `(setup_id, 'starred_setup')`. Aggregation happens _after_ scoring: keep the highest-scored row as the representative, attach up to two actor avatars plus a total count (`aggregatedActors`, `aggregatedCount`). Other action types always render individually.

### Panel size and pagination

- **Home panel:** 8 initial items.
- **Footer:** both an inline `Load more` button (appends rows via the existing `ActivityFeed` fetch pattern) and a `See all →` link to `/feed`.
- **`/feed`:** 20 items per page, same blended query.
- **Cursor:** the `(score, createdAt)` tuple of the last item on the page keeps ranking stable across pages.

### Voice

- When `actor.id === viewer.id`, render the actor as **"You"** (bold).
- Otherwise render as **`@username`**.

### Empty state

- If the user has own activity, follows, or popular candidates, render whatever the blend produces — even if it's all popular sprinkles.
- If the only content is popular, render it and show a dismissible banner at the top of the panel: _"Follow people to personalize your feed →"_ (links to `/explore`, which surfaces discoverable setups and their authors). Dismiss state persists in `localStorage` under `activity-follow-cta-dismissed`.
- If there are literally zero candidate rows, render: _"No activity yet. Follow people to see what they're up to →"_ (also links to `/explore`).

### Visual treatment

- **Layout:** reuses `ActivityFeed.svelte` + `ActivityItem.svelte`. The `ActivityPanel` wrapper adds the `ACTIVITY` header, footer buttons, and the empty-state / CTA logic.
- **Avatar stack** (for aggregated starred items): the first two actor avatars overlap by 10px, with a 2px background-colored border on the second avatar for separation.
- **Popular pill:** `bg-primary/10 text-primary`, `rounded-full`, lowercase `popular`, rendered inline after the object.
- **Comment preview:** 2-line `line-clamp-2` body rendered in `text-xs text-muted-foreground` below the action line.

## Architecture

### Files added

- `src/lib/server/queries/activityFeed.ts`
  - `getBlendedActivityFeed(viewerId, cursor?, limit)` — returns `{ items: FeedItem[], nextCursor: string | null }`.
  - Internal helpers for the three bucket queries, scoring, and aggregation.
- `src/lib/components/ActivityPanel.svelte` — home-sized wrapper (header, `ActivityFeed` for items, footer with `Load more` + `See all →`, empty state + CTA banner).
- `src/lib/server/queries/activityFeed.test.ts` — unit tests.
- `src/lib/components/ActivityPanel.test.ts` — component tests.

### Files modified

- `src/lib/server/queries/activities.ts`
  - `FeedItem` gains `isPopular?: boolean`, `isOwnActivity?: boolean`, `aggregatedActors?: { username; avatarUrl }[]`, `aggregatedCount?: number`.
  - `getHomeFeed` — **deleted** (replaced by `getBlendedActivityFeed`).
  - `getActivityOnUserSetups` + `SetupActivityEntry` type — **deleted**.
  - `getProfileFeed` — unchanged.
- `src/lib/components/ActivityItem.svelte`
  - Adds "You" voice when `isOwnActivity`.
  - Adds popular pill when `isPopular`.
  - Adds avatar stack + aggregated-actors copy when `aggregatedActors.length > 1`.
  - Adds team event rendering (`created_team`, `joined_team`, `left_team`, `invited_to_team`).
- `src/routes/+page.server.ts`
  - Replace `getActivityOnUserSetups` call with `getBlendedActivityFeed(viewerId, undefined, 8)`.
  - Rename returned prop from `yourActivity` to `activityFeed`.
- `src/routes/+page.svelte`
  - Swap `YourActivityPanel` import + usage for `ActivityPanel`.
- `src/routes/(app)/feed/+page.server.ts` — call `getBlendedActivityFeed` with `limit = 20`.
- `src/routes/api/v1/feed/+server.ts` — call `getBlendedActivityFeed` with `limit = 20` for pagination.

### Files deleted

- `src/lib/components/YourActivityPanel.svelte`
- Any existing tests for `YourActivityPanel` or `getActivityOnUserSetups`.

## Performance

- The three bucket queries run in parallel under `Promise.all`. Each fetches ~2× the final `limit` (≈16–24 rows) to give scoring room.
- Total candidate pool per request: ~56 rows → sorted in memory → top N returned.
- Existing indexes cover the hot paths:
  - `activities_user_id_created_at_idx` — own + follows buckets
  - `activities_setup_id_created_at_idx` — popular bucket (by setup stars)
- The popular bucket filters on the denormalized `users.followersCount` and `setups.starsCount` columns directly — no join-and-count at query time. If the candidate-pool scan regresses at larger scale, cache the popular candidate pool per hour. **Not required for MVP.**
- No database migrations.

## Testing

### Unit — `src/lib/server/queries/activityFeed.test.ts`

- fills 8 slots from own + follows + popular buckets when all are available
- weights own above follows above popular given equal recency
- recency decay demotes a 7-day-old popular item below a 10-min-old follow item
- aggregates same-setup `starred_setup` events within 24h into one row with `aggregatedActors` populated
- does NOT aggregate `starred_setup` events more than 24h apart
- does NOT aggregate `commented`, `created_setup`, or `followed_user` events
- hides team events when viewer is not a team member
- shows team events when viewer IS a team member
- hides private setup events from non-owners / non-team-members
- excludes the viewer from follows and popular buckets (no duplication across buckets)
- cursor pagination returns stable, non-overlapping pages
- returns empty array when viewer has no own, no follows, and no popular candidates

### Component — `src/lib/components/ActivityPanel.test.ts`

- renders "You" for own activity items
- renders `@username` for other actors
- renders avatar stack for aggregated starred items (2 visible + count)
- renders "popular" pill only when `isPopular === true`
- renders comment body with 2-line clamp on commented items
- renders zero-content empty state when no items
- renders dismissible follow-CTA banner when only popular items are present
- persists banner dismiss state across mounts via `localStorage`

### E2E — extend `src/routes/page.svelte.e2e.ts`

- dashboard shows ACTIVITY panel with up to 8 items on desktop
- clicking `Load more` appends rows without re-rendering the existing ones
- clicking `See all →` navigates to `/feed` and shows blended items there
- mobile viewport renders the panel correctly in the column flow order

### Screenshots

Per project CLAUDE.md, capture desktop (1280×720) and mobile (430×932) screenshots of the dashboard with the new panel during dev, save to `screenshots/` for visual review.

## Out of Scope

- Realtime updates (polling / WebSocket). The panel refreshes on page load or via manual `Load more`.
- Filtering UI (e.g., follow-only toggle) on `/feed`. Can be added later as a filter chip if demand warrants.
- Cached / pre-computed popular pool. Deferred until performance regression appears at scale.
- Notifications for activity on the viewer's own setups (the old `getActivityOnUserSetups` use case). If we want this back, it should be a separate bell/notifications UI, not a dashboard panel.
- Surfacing `cloned_setup` events in the feed.

## Open Questions

None at this point. Weight and decay constants are tunable after ship.
