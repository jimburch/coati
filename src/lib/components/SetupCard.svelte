<script lang="ts">
	import type { SetupCardProps } from '$lib/types';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { timeAgo } from '$lib/utils';
	import AgentIcon from '$lib/components/AgentIcon.svelte';

	type Props = {
		setup: SetupCardProps;
		username: string;
		showAuthor?: boolean;
	};

	const { setup, username, showAuthor = false }: Props = $props();

	const MAX_AGENTS = 3;
	const visibleAgents = $derived(setup.agents?.slice(0, MAX_AGENTS) ?? []);
	const overflowCount = $derived(Math.max(0, (setup.agents?.length ?? 0) - MAX_AGENTS));
</script>

<a
	href="/{username}/{setup.slug}"
	class="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/50 lg:p-4"
>
	<h3 class="truncate text-sm font-semibold text-foreground lg:text-base">{setup.name}</h3>

	{#if setup.description}
		<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{setup.description}</p>
	{/if}

	{#if visibleAgents.length > 0}
		<div class="mt-2 flex flex-wrap items-center gap-1.5">
			{#each visibleAgents as agent (agent.id)}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
				>
					<AgentIcon slug={agent.slug} size={12} />
					{agent.displayName}
				</span>
			{/each}
			{#if overflowCount > 0}
				<span class="text-xs text-muted-foreground">+{overflowCount}</span>
			{/if}
		</div>
	{/if}

	<div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
		<span class="inline-flex items-center gap-1">
			<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
				/>
			</svg>
			{setup.starsCount}
		</span>

		{#if showAuthor}
			<span class="ml-auto inline-flex items-center gap-1.5">
				<Avatar class="size-4 text-[8px]">
					{#if setup.ownerAvatarUrl}
						<AvatarImage src={setup.ownerAvatarUrl} alt={username} />
					{/if}
					<AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
				</Avatar>
				{username}
			</span>
		{:else}
			<span class="ml-auto">{timeAgo(setup.updatedAt)}</span>
		{/if}
	</div>
</a>
