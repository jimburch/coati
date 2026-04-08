<script lang="ts">
	import type { PageData } from './$types';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';

	const { data }: { data: PageData } = $props();

	// Hydrate dates (they may arrive as strings from server serialization)
	const feedItems = $derived(
		data.feed.items.map((item) => ({
			...item,
			createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
		}))
	);
</script>

<main class="mx-auto max-w-2xl px-4 py-6 lg:py-8">
	<h1 class="mb-4 text-xl font-semibold text-foreground lg:mb-6 lg:text-2xl">Your Feed</h1>

	<ActivityFeed
		items={feedItems}
		emptyMessage="No recent activity from people you follow"
		paginationEndpoint="/api/v1/feed"
		emptyActionHref="/explore"
		emptyActionLabel="Discover setups to explore"
	/>
</main>
