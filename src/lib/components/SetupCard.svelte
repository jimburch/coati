<script lang="ts">
	import type { SetupCardProps } from '$lib/types';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { timeAgo } from '$lib/utils';
	import AgentIcon from '$lib/components/AgentIcon.svelte';

	type Props = {
		setup: SetupCardProps;
		username: string;
		showAuthor?: boolean;
		variant?: 'default' | 'featured';
	};

	const { setup, username, showAuthor = false, variant = 'default' }: Props = $props();

	const featured = $derived(variant === 'featured');

	const isTeamSetup = $derived(!!setup.teamSlug);
	const href = $derived(
		isTeamSetup ? `/org/${setup.teamSlug}/${setup.slug}` : `/${username}/${setup.slug}`
	);

	const MAX_AGENTS = 3;
	const visibleAgents = $derived(setup.agents?.slice(0, MAX_AGENTS) ?? []);
	const overflowCount = $derived(Math.max(0, (setup.agents?.length ?? 0) - MAX_AGENTS));
</script>

<a
	{href}
	class={featured
		? 'flex h-full flex-col rounded-lg border border-primary/50 bg-card p-5 transition-colors hover:border-foreground/20 hover:bg-accent/50 lg:p-6'
		: 'flex h-full flex-col rounded-lg border border-border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/50 lg:p-4'}
>
	<h3
		class={featured
			? 'truncate text-base font-semibold text-foreground lg:text-lg'
			: 'truncate text-sm font-semibold text-foreground lg:text-base'}
	>
		{setup.display ?? setup.name}
	</h3>

	{#if setup.description}
		<p
			class={featured
				? 'mt-1 text-sm text-muted-foreground'
				: 'mt-1 line-clamp-2 text-sm text-muted-foreground'}
		>
			{setup.description}
		</p>
	{/if}

	<div class="mt-2 flex h-6 flex-nowrap items-center gap-1.5 overflow-hidden">
		{#each visibleAgents as agent (agent.id)}
			<span
				class="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
			>
				<AgentIcon slug={agent.slug} size={16} />
				{agent.displayName}
			</span>
		{/each}
		{#if overflowCount > 0}
			<span class="shrink-0 text-xs text-muted-foreground">+{overflowCount}</span>
		{/if}
	</div>

	<div class="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
		<span class="inline-flex items-center gap-1">
			<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
				/>
			</svg>
			{setup.starsCount}
		</span>

		{#if featured}
			<span class="inline-flex items-center gap-1">
				<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
					<path
						d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h4.5a.75.75 0 0 1 0 1.5h-4.5A2.25 2.25 0 0 0 3.5 12.25v.878a2.25 2.25 0 1 0 1.5 0v-.878a.75.75 0 0 1 .75-.75h4.5a2.25 2.25 0 0 0 2.25-2.25V5.372a2.25 2.25 0 1 0-1.5 0V8.5a.75.75 0 0 1-.75.75h-4.5A2.25 2.25 0 0 0 5 6.128V5.372zm6.75-1.122a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 9.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z"
					/>
				</svg>
				{setup.clonesCount}
			</span>
		{/if}

		{#if showAuthor}
			{#if isTeamSetup}
				<span class="ml-auto inline-flex items-center gap-1.5">
					<Avatar class="size-4 text-[8px]">
						{#if setup.teamAvatarUrl}
							<AvatarImage src={setup.teamAvatarUrl} alt={setup.teamName ?? ''} />
						{/if}
						<AvatarFallback>{(setup.teamName ?? 'T')[0].toUpperCase()}</AvatarFallback>
					</Avatar>
					{setup.teamName}
				</span>
			{:else}
				<span class="ml-auto inline-flex items-center gap-1.5">
					<Avatar class="size-4 text-[8px]">
						{#if setup.ownerAvatarUrl}
							<AvatarImage src={setup.ownerAvatarUrl} alt={username} />
						{/if}
						<AvatarFallback>{username[0].toUpperCase()}</AvatarFallback>
					</Avatar>
					{username}
				</span>
			{/if}
		{:else}
			<span class="ml-auto">{timeAgo(setup.updatedAt)}</span>
		{/if}
	</div>
</a>
