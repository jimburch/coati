<script lang="ts">
	import { untrack } from 'svelte';
	import ActivityItem from '$lib/components/ActivityItem.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { FeedItem } from '$lib/server/queries/activities';

	type Props = {
		items: FeedItem[];
		emptyMessage: string;
		paginationEndpoint: string;
		emptyActionHref?: string;
		emptyActionLabel?: string;
	};

	const {
		items: initialItems,
		emptyMessage,
		paginationEndpoint,
		emptyActionHref,
		emptyActionLabel
	}: Props = $props();

	// untrack() prevents Svelte from warning about capturing the initial prop value in $state —
	// this is intentional: allItems, cursor, and hasMore diverge from the prop after pagination.
	let allItems = $state<FeedItem[]>(untrack(() => initialItems));
	let cursor = $state<string | null>(
		untrack(() =>
			initialItems.length > 0 ? initialItems[initialItems.length - 1].createdAt.toISOString() : null
		)
	);
	// We don't know if there are more items until we try; treat as possibly more if we got a full page
	let hasMore = $state(untrack(() => initialItems.length >= 20));
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		error = null;

		try {
			const url = cursor
				? `${paginationEndpoint}?cursor=${encodeURIComponent(cursor)}`
				: paginationEndpoint;
			const res = await fetch(url);
			if (!res.ok) {
				error = 'Failed to load more activities.';
				return;
			}
			const json = await res.json();
			const { items: newItems, nextCursor } = json.data as {
				items: FeedItem[];
				nextCursor: string | null;
			};

			// Deserialize dates (they arrive as strings from JSON)
			const hydrated = newItems.map((item) => ({
				...item,
				createdAt: new Date(item.createdAt)
			}));

			allItems = [...allItems, ...hydrated];
			cursor = nextCursor;
			hasMore = nextCursor !== null;
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

{#if allItems.length === 0}
	<div class="py-12 text-center" data-testid="feed-empty">
		<p class="text-muted-foreground">{emptyMessage}</p>
		{#if emptyActionHref && emptyActionLabel}
			<a
				href={emptyActionHref}
				class="mt-3 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
			>
				{emptyActionLabel}
			</a>
		{/if}
	</div>
{:else}
	<div class="divide-y divide-border" data-testid="feed-list">
		{#each allItems as item (item.id)}
			<ActivityItem {item} />
		{/each}
	</div>

	{#if hasMore}
		<div class="mt-4 text-center">
			{#if error}
				<p class="mb-2 text-sm text-destructive">{error}</p>
			{/if}
			<Button
				variant="outline"
				onclick={loadMore}
				disabled={loading}
				data-testid="load-more-button"
			>
				{loading ? 'Loading…' : 'Load more'}
			</Button>
		</div>
	{/if}
{/if}
