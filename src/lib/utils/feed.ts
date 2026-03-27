import type { FeedItem } from '$lib/server/queries/activities';

type SerializedFeedItem = Omit<FeedItem, 'createdAt'> & { createdAt: Date | string };

/**
 * Re-hydrates `createdAt` dates after JSON round-trips.
 * Idempotent: safe to call on items that already have Date objects.
 */
export function deserializeFeedItems(items: SerializedFeedItem[]): FeedItem[] {
	return items.map((item) => ({
		...item,
		createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
	}));
}
