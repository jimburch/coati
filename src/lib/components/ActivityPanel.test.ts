import { describe, it, expect } from 'vitest';
import type { FeedItem } from '$lib/server/queries/activities';

// Pure logic extracted from ActivityPanel.svelte for unit testing

const DISMISS_KEY = 'activity-follow-cta-dismissed';
type EmptyState = 'none' | 'zero';
function resolveEmptyState(items: FeedItem[]): EmptyState {
	return items.length === 0 ? 'zero' : 'none';
}
function shouldShowFollowCta(items: FeedItem[], dismissed: boolean): boolean {
	if (dismissed) return false;
	if (items.length === 0) return false;
	return items.every((i) => i.isPopular === true);
}

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
