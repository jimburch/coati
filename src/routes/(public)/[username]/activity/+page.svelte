<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';
	import type { FeedItem } from '$lib/server/queries/activities';

	const { data } = $props();

	// Hydrate dates (server sends strings over the wire)
	const activityItems = $derived(
		(data.items as FeedItem[]).map((item) => ({
			...item,
			createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
		}))
	);
</script>

<svelte:head>
	<title>{data.profile.username}'s activity - Coati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<!-- User context header -->
	<div class="mb-6 flex items-center gap-3">
		<a href="/{data.profile.username}">
			<Avatar class="size-10">
				<AvatarImage src={data.profile.avatarUrl} alt={data.profile.username} />
				<AvatarFallback>{data.profile.username[0].toUpperCase()}</AvatarFallback>
			</Avatar>
		</a>
		<div>
			<a
				href="/{data.profile.username}"
				class="font-semibold hover:underline underline-offset-4"
				data-testid="activity-username"
			>
				{data.profile.username}
			</a>
			<p class="text-sm text-muted-foreground">Activity history</p>
		</div>
	</div>

	<ActivityFeed
		items={activityItems}
		emptyMessage="No activity yet."
		paginationEndpoint="/api/v1/users/{data.profile.username}/activity"
	/>
</div>
