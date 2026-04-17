import { describe, it, expect } from 'vitest';
import { deserializeFeedItems } from './feed';
import type { FeedItem } from '$lib/server/queries/activities';

function makeItem(
	createdAt: Date | string
): FeedItem | (Omit<FeedItem, 'createdAt'> & { createdAt: Date | string }) {
	return {
		id: 'test-id',
		actionType: 'created_setup',
		createdAt,
		actorUsername: 'alice',
		actorAvatarUrl: 'https://example.com/avatar.png',
		setupId: null,
		setupName: null,
		setupSlug: null,
		setupOwnerUsername: null,
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
}

describe('deserializeFeedItems', () => {
	it('converts string createdAt to Date', () => {
		const dateStr = '2024-01-15T12:00:00.000Z';
		const items = [makeItem(dateStr)];
		const result = deserializeFeedItems(items as Parameters<typeof deserializeFeedItems>[0]);
		expect(result[0].createdAt).toBeInstanceOf(Date);
		expect(result[0].createdAt.toISOString()).toBe(dateStr);
	});

	it('preserves Date createdAt (idempotent)', () => {
		const date = new Date('2024-01-15T12:00:00.000Z');
		const items = [makeItem(date)];
		const result = deserializeFeedItems(items as Parameters<typeof deserializeFeedItems>[0]);
		expect(result[0].createdAt).toBeInstanceOf(Date);
		expect(result[0].createdAt.toISOString()).toBe(date.toISOString());
	});

	it('handles empty array', () => {
		expect(deserializeFeedItems([])).toEqual([]);
	});

	it('processes multiple items', () => {
		const items = [
			makeItem('2024-01-01T00:00:00.000Z'),
			makeItem(new Date('2024-06-15T10:30:00.000Z'))
		];
		const result = deserializeFeedItems(items as Parameters<typeof deserializeFeedItems>[0]);
		expect(result).toHaveLength(2);
		result.forEach((item) => expect(item.createdAt).toBeInstanceOf(Date));
	});
});
