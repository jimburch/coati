<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import SetupCard from '$lib/components/SetupCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import { Input } from '$lib/components/ui/input';
	import type { ExploreSort } from '$lib/types';

	const { data } = $props();

	// eslint-disable-next-line svelte/prefer-writable-derived -- needs two-way binding for search input
	let searchInput = $state(untrack(() => data.q ?? ''));
	$effect(() => {
		searchInput = data.q ?? '';
	});

	const sortLabels: Record<ExploreSort, string> = {
		newest: 'Newest',
		trending: 'Trending',
		stars: 'Most Stars',
		clones: 'Most Clones'
	};

	function buildUrl(
		overrides: {
			q?: string | undefined;
			agents?: string[] | undefined;
			tag?: string | undefined;
			sort?: string | undefined;
			page?: number | undefined;
		} = {}
	): string {
		const merged = {
			q: 'q' in overrides ? overrides.q : data.q,
			agents: 'agents' in overrides ? overrides.agents : data.agents,
			tag: 'tag' in overrides ? overrides.tag : data.tag,
			sort: 'sort' in overrides ? overrides.sort : data.sort,
			page: 'page' in overrides ? overrides.page : data.page
		};

		const parts: string[] = [];
		if (merged.q) parts.push(`q=${encodeURIComponent(merged.q)}`);
		for (const slug of merged.agents ?? []) {
			parts.push(`agent=${encodeURIComponent(slug)}`);
		}
		if (merged.tag) parts.push(`tag=${encodeURIComponent(String(merged.tag))}`);
		if (merged.sort && merged.sort !== 'newest') parts.push(`sort=${merged.sort}`);
		if (merged.page && Number(merged.page) > 1) parts.push(`page=${String(merged.page)}`);

		return `/explore${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
	}

	function buildPageUrl(p: number): string {
		return buildUrl({ page: p });
	}

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		goto(buildUrl({ q: searchInput || undefined, page: 1 }));
	}

	function handleFilterChange(key: string, value: string) {
		goto(buildUrl({ [key]: value || undefined, page: 1 }));
	}

	function toggleAgent(slug: string) {
		const current = data.agents ?? [];
		const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
		goto(buildUrl({ agents: next.length > 0 ? next : undefined, page: 1 }));
	}

	const hasFilters = $derived(
		!!data.q || (data.agents?.length ?? 0) > 0 || !!data.tag || data.sort !== 'newest'
	);
</script>

<svelte:head>
	<title>Explore Setups - Coati</title>
	<meta name="description" content="Browse AI coding workflows and setups on Coati." />
</svelte:head>

<OgMeta
	title="Explore Setups - Coati"
	description="Browse AI coding workflows and setups on Coati."
	url="/explore"
	type="website"
	twitterCard="summary"
/>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-8">
	<div class="mb-4 flex items-baseline justify-between lg:mb-6">
		<h1 class="text-xl font-bold lg:text-2xl">Explore Setups</h1>
		<span class="text-sm text-muted-foreground">
			{data.total}
			{data.total === 1 ? 'setup' : 'setups'}
		</span>
	</div>

	<!-- Search bar -->
	<form onsubmit={handleSearch} class="mb-4">
		<div class="relative">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<Input
				type="search"
				name="q"
				placeholder="Search setups..."
				class="h-10 w-full pl-10"
				bind:value={searchInput}
			/>
		</div>
	</form>

	<!-- Agent filter chips -->
	{#if data.allAgents.length > 0}
		<div class="mb-3 flex flex-wrap items-center gap-1.5 lg:mb-4 lg:gap-2">
			{#each data.allAgents as agent (agent.id)}
				{@const isActive = data.agents?.includes(agent.slug)}
				<button
					type="button"
					onclick={() => toggleAgent(agent.slug)}
					class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
						{isActive
						? 'border-foreground bg-foreground text-background'
						: 'border-border bg-background text-foreground hover:border-foreground/50 hover:bg-accent'}"
					aria-pressed={isActive}
					data-agent-slug={agent.slug}
				>
					<AgentIcon slug={agent.slug} size={14} />
					{agent.displayName}
					{#if agent.setupsCount > 0}
						<span
							class="ml-0.5 tabular-nums {isActive
								? 'text-background/70'
								: 'text-muted-foreground'}"
						>
							{agent.setupsCount}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Filter/sort bar -->
	<div class="mb-4 flex flex-wrap items-center gap-2 lg:mb-6 lg:gap-3">
		<select
			class="h-9 rounded-md border border-input bg-background px-3 text-sm"
			value={data.tag ?? ''}
			onchange={(e) => handleFilterChange('tag', e.currentTarget.value)}
		>
			<option value="">All Tags</option>
			{#each data.allTags as tag (tag.id)}
				<option value={tag.name}>{tag.name}</option>
			{/each}
		</select>

		<select
			class="h-9 rounded-md border border-input bg-background px-3 text-sm"
			value={data.sort}
			onchange={(e) => handleFilterChange('sort', e.currentTarget.value)}
		>
			{#each Object.entries(sortLabels) as [value, label] (value)}
				<option {value}>{label}</option>
			{/each}
		</select>

		<!-- Active filter chips -->
		{#if hasFilters}
			<div class="flex flex-wrap items-center gap-2">
				{#if data.q}
					<a
						href={buildUrl({ q: undefined, page: 1 })}
						class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
					>
						&ldquo;{data.q}&rdquo;
						<span aria-label="Remove search">&times;</span>
					</a>
				{/if}
				{#if data.tag}
					<a
						href={buildUrl({ tag: undefined, page: 1 })}
						class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
					>
						{data.tag}
						<span aria-label="Remove tag filter">&times;</span>
					</a>
				{/if}
				{#if data.sort !== 'newest'}
					<a
						href={buildUrl({ sort: undefined, page: 1 })}
						class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
					>
						{sortLabels[data.sort]}
						<span aria-label="Remove sort">&times;</span>
					</a>
				{/if}
				<a href="/explore" class="text-xs text-muted-foreground hover:text-foreground">
					Clear all
				</a>
			</div>
		{/if}
	</div>

	<!-- Results grid -->
	{#if data.items.length > 0}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
			{#each data.items as setup (setup.id)}
				<SetupCard {setup} username={setup.ownerUsername} showAuthor />
			{/each}
		</div>

		<div class="mt-6 lg:mt-8">
			<Pagination page={data.page} totalPages={data.totalPages} buildUrl={buildPageUrl} />
		</div>
	{:else}
		<div class="py-8 text-center lg:py-12">
			<p class="text-muted-foreground">No setups match your filters.</p>
			{#if hasFilters}
				<a href="/explore" class="mt-2 inline-block text-sm text-primary hover:underline">
					Clear filters
				</a>
			{/if}
		</div>
	{/if}
</div>
