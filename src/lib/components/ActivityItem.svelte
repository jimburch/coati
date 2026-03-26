<script lang="ts">
	import { onMount } from 'svelte';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { timeAgo } from '$lib/utils';
	import type { FeedItem } from '$lib/server/queries/activities';

	type Props = {
		item: FeedItem;
	};

	const { item }: Props = $props();

	let tick = $state(0);
	const relativeTime = $derived.by(() => {
		void tick;
		return timeAgo(item.createdAt);
	});

	onMount(() => {
		// Refresh relative timestamp every minute
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
</script>

<div class="flex gap-3 py-3" data-testid="activity-item">
	<a href="/{item.actorUsername}" class="shrink-0">
		<Avatar class="size-9 text-xs">
			<AvatarImage src={item.actorAvatarUrl} alt={item.actorUsername} />
			<AvatarFallback>{item.actorUsername[0].toUpperCase()}</AvatarFallback>
		</Avatar>
	</a>

	<div class="min-w-0 flex-1">
		<p class="text-sm leading-snug text-foreground">
			<a href="/{item.actorUsername}" class="font-semibold hover:underline">
				{item.actorUsername}
			</a>

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
					<a href="/{item.targetUsername}" class="font-medium hover:underline">
						@{item.targetUsername}
					</a>
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
			{/if}
		</p>

		{#if item.actionType === 'commented' && item.commentBody}
			<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
				{item.commentBody}
			</p>
		{/if}

		<p class="mt-1 text-xs text-muted-foreground" data-testid="activity-timestamp">
			{relativeTime}
		</p>
	</div>
</div>
