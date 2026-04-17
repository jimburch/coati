<script lang="ts">
	import SetupCard from './SetupCard.svelte';

	type Setup = {
		id: string;
		name: string;
		slug: string;
		description: string;
		display?: string | null;
		starsCount: number;
		clonesCount: number;
		updatedAt: Date;
		ownerUsername: string;
		ownerAvatarUrl?: string;
		agents: { id: string; displayName: string; slug: string }[];
	};

	type Tab = 'for-you' | 'following' | 'trending';

	type Props = {
		trendingSetups: Setup[];
		forYouSetups: Setup[];
		activeTab: Tab;
	};

	const { trendingSetups, forYouSetups, activeTab }: Props = $props();

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'for-you', label: 'For You' },
		{ id: 'following', label: 'Following' },
		{ id: 'trending', label: 'Trending' }
	];
</script>

<section>
	<nav class="mb-4 flex border-b border-border">
		{#each tabs as tab (tab.id)}
			<a
				href="?tab={tab.id}"
				class="border-b-2 px-3 py-2 text-sm font-medium transition-colors {activeTab === tab.id
					? 'border-foreground text-foreground'
					: 'border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground'}"
				aria-current={activeTab === tab.id ? 'page' : undefined}
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{#if activeTab === 'trending'}
		{#if trendingSetups.length > 0}
			<div class="grid grid-cols-2 gap-3">
				{#each trendingSetups as setup (setup.id)}
					<SetupCard {setup} username={setup.ownerUsername} showAuthor />
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-8 text-center">
				<p class="text-sm text-muted-foreground">No trending setups yet.</p>
			</div>
		{/if}
		<div class="mt-3 flex justify-end">
			<a
				href="/explore?sort=trending"
				class="text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				View more &rarr;
			</a>
		</div>
	{:else if activeTab === 'following'}
		<div class="rounded-lg border border-dashed border-border py-8 text-center">
			<p class="text-sm text-muted-foreground">Setups from people you follow will appear here.</p>
		</div>
		<div class="mt-3 flex justify-end">
			<a
				href="/explore?filter=following"
				class="text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				View more &rarr;
			</a>
		</div>
	{:else}
		{#if forYouSetups.length > 0}
			<div class="grid grid-cols-2 gap-3">
				{#each forYouSetups as setup (setup.id)}
					<SetupCard {setup} username={setup.ownerUsername} showAuthor />
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-8 text-center">
				<p class="text-sm text-muted-foreground">
					No recommendations yet. Star some setups to help us learn your taste!
				</p>
			</div>
		{/if}
		<div class="mt-3 flex justify-end">
			<a
				href="/explore"
				class="text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				View more &rarr;
			</a>
		</div>
	{/if}
</section>
