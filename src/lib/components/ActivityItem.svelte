<script lang="ts">
	import { onMount } from 'svelte';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { timeAgo } from '$lib/utils';
	import type { FeedItem } from '$lib/server/queries/activities';

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
