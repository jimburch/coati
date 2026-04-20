import { describe, it, expect } from 'vitest';
import type { FeedItem } from '$lib/server/queries/activities';

// Pure logic extracted from ActivityItem.svelte for unit testing

function resolveActorLabel(item: FeedItem): string {
	return item.isOwnActivity ? 'You' : `@${item.actorUsername}`;
}
function aggregatedActorsText(item: FeedItem): string | null {
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
function shouldShowPopularPill(item: FeedItem): boolean {
	return item.isPopular === true;
}
function shouldShowAvatarStack(item: FeedItem): boolean {
	return (item.aggregatedActors?.length ?? 0) >= 2;
}
function shouldShowCommentPreview(item: FeedItem): boolean {
	return item.actionType === 'commented' && !!item.commentBody && item.commentBody.length > 0;
}

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
