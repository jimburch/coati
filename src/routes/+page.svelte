<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import SetupCard from '$lib/components/SetupCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Upload, Search, Download } from '@lucide/svelte';
	import type { ExploreSort } from '$lib/types';

	const { data } = $props();

	const LBRACE = '{';
	const RBRACE = '}';

	// Authenticated dashboard state
	// eslint-disable-next-line svelte/prefer-writable-derived -- needs two-way binding for search input
	let searchInput = $state(untrack(() => data.q ?? ''));
	$effect(() => {
		searchInput = data.q ?? '';
	});

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let showAllTrending = $state(false);

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

		return `/${parts.length > 0 ? `?${parts.join('&')}` : ''}`;
	}

	function handleInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			goto(buildUrl({ q: searchInput || undefined, page: 1 }), { replaceState: true });
		}, 300);
	}

	function clearSearch() {
		searchInput = '';
		clearTimeout(debounceTimer);
		goto('/');
	}

	function toggleAgent(slug: string) {
		const current = data.agents ?? [];
		const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
		goto(buildUrl({ agents: next.length > 0 ? next : undefined, page: 1 }));
	}

	function handleFilterChange(key: string, value: string) {
		goto(buildUrl({ [key]: value || undefined, page: 1 }));
	}

	function buildPageUrl(p: number): string {
		return buildUrl({ page: p });
	}

	const hasFilters = $derived(
		!!data.q || (data.agents?.length ?? 0) > 0 || !!data.tag || data.sort !== 'newest'
	);
</script>

<svelte:head>
	<title>Coati - Share AI Coding Workflows</title>
	<meta
		name="description"
		content="Discover, share, and clone AI coding workflows and setups for Claude Code, Cursor, Copilot, and more."
	/>
</svelte:head>

<OgMeta
	title="Coati - Share AI Coding Workflows"
	description="Discover, share, and clone AI coding workflows and setups for Claude Code, Cursor, Copilot, and more."
	url="/"
	type="website"
	twitterCard="summary"
/>

{#if data.user}
	<!-- Authenticated: Discovery Dashboard -->

	<!-- Search bar + filters -->
	<div class="border-b border-border">
		<div class="mx-auto max-w-7xl px-4 py-4 lg:py-5">
			<!-- Search input -->
			<div class="relative mb-3">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
				<Input
					type="search"
					name="q"
					placeholder="Search setups..."
					class="h-10 w-full pl-10 pr-10"
					bind:value={searchInput}
					oninput={handleInput}
				/>
				{#if searchInput}
					<button
						type="button"
						onclick={clearSearch}
						class="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
						aria-label="Clear search"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>

			<!-- Agent filter chips -->
			{#if data.allAgents.length > 0}
				<div class="mb-3 flex flex-wrap items-center gap-1.5">
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

			<!-- Tag + sort dropdowns + active filter chips -->
			<div class="flex flex-wrap items-center gap-2">
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

				{#if hasFilters}
					<div class="flex flex-wrap items-center gap-2">
						{#if data.q}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
							>
								&ldquo;{data.q}&rdquo;
								<button
									type="button"
									onclick={clearSearch}
									aria-label="Remove search"
									class="hover:text-foreground">&times;</button
								>
							</span>
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
						<a href="/" class="text-xs text-muted-foreground hover:text-foreground"> Clear all </a>
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if data.searchActive}
		<!-- Search results -->
		<section>
			<div class="mx-auto max-w-7xl px-4 py-6 lg:py-8">
				<div class="mb-4 flex items-baseline justify-between">
					<p class="text-sm text-muted-foreground">
						{data.searchTotal}
						{data.searchTotal === 1 ? 'setup' : 'setups'} found
					</p>
				</div>

				{#if data.searchItems.length > 0}
					<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
						{#each data.searchItems as setup (setup.id)}
							<SetupCard {setup} username={setup.ownerUsername} showAuthor />
						{/each}
					</div>

					<div class="mt-6 lg:mt-8">
						<Pagination
							page={data.searchPage}
							totalPages={data.searchTotalPages}
							buildUrl={buildPageUrl}
						/>
					</div>
				{:else}
					<div class="py-8 text-center lg:py-12">
						<p class="text-muted-foreground">No setups match your filters.</p>
						{#if hasFilters}
							<a href="/" class="mt-2 inline-block text-sm text-primary hover:underline">
								Clear filters
							</a>
						{/if}
					</div>
				{/if}
			</div>
		</section>
	{:else}
		<!-- Featured, Trending, Recently Added (fade out when search activates) -->
		<div transition:fade={{ duration: 150 }}>
			{#if data.featuredSetups.length > 0}
				<!-- Featured Setups -->
				<section class="border-b border-border">
					<div class="mx-auto max-w-7xl px-4 py-10 lg:py-16">
						<div class="mb-6 flex items-baseline justify-between lg:mb-8">
							<h2 class="text-xl font-bold tracking-tight lg:text-2xl">Featured Setups</h2>
						</div>
						<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
							{#each data.featuredSetups as setup (setup.id)}
								<SetupCard {setup} username={setup.ownerUsername} showAuthor variant="featured" />
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- Trending -->
			<section class="border-b border-border">
				<div class="mx-auto max-w-7xl px-4 py-10 lg:py-16">
					<div class="mb-6 flex items-baseline justify-between lg:mb-8">
						<h2 class="text-xl font-bold tracking-tight lg:text-2xl">Trending</h2>
						<a
							href="/explore?sort=trending"
							class="text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							View all trending &rarr;
						</a>
					</div>

					{#if data.trendingSetups.length > 0}
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each data.trendingSetups as setup, i (setup.id)}
								<div class={i >= 3 && !showAllTrending ? 'hidden lg:block' : ''}>
									<SetupCard {setup} username={setup.ownerUsername} showAuthor />
								</div>
							{/each}
						</div>

						{#if data.trendingSetups.length > 3}
							<div class="mt-4 text-center lg:hidden">
								<button
									onclick={() => (showAllTrending = !showAllTrending)}
									class={buttonVariants({ variant: 'outline', size: 'sm' })}
								>
									{showAllTrending ? 'Show less' : 'Show more'}
								</button>
							</div>
						{/if}
					{:else}
						<div class="rounded-lg border border-dashed border-border py-12 text-center">
							<p class="text-muted-foreground">No trending setups yet.</p>
						</div>
					{/if}
				</div>
			</section>

			<!-- Recently Added -->
			<section>
				<div class="mx-auto max-w-7xl px-4 py-10 lg:py-16">
					<div class="mb-6 flex items-baseline justify-between lg:mb-8">
						<h2 class="text-xl font-bold tracking-tight lg:text-2xl">Recently Added</h2>
						<a
							href="/explore?sort=newest"
							class="text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							View all recent &rarr;
						</a>
					</div>

					{#if data.recentSetups.length > 0}
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{#each data.recentSetups as setup (setup.id)}
								<SetupCard {setup} username={setup.ownerUsername} showAuthor />
							{/each}
						</div>
					{:else}
						<div class="rounded-lg border border-dashed border-border py-12 text-center">
							<p class="text-muted-foreground">No setups yet. Be the first to share one!</p>
						</div>
					{/if}
				</div>
			</section>
		</div>
	{/if}
{:else}
	<!-- Unauthenticated: Marketing landing page -->

	<!-- Hero -->
	<section class="overflow-hidden border-b border-border">
		<div
			class="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:py-24"
		>
			<!-- Left: copy -->
			<div>
				<p class="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
					Open-source workflow sharing
				</p>
				<h1 class="text-3xl font-bold leading-tight tracking-tight lg:text-5xl">
					Share your AI coding&nbsp;workflows
				</h1>
				<p class="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
					Package your config files, tools, and automation into shareable setups. Discover what
					other developers are running and clone it in one command.
				</p>
				<div class="mt-6 flex flex-wrap gap-3 lg:mt-8">
					<a href="/auth/login/github" class={buttonVariants({ variant: 'default', size: 'lg' })}>
						Sign in with GitHub
					</a>
					<a href="/explore" class={buttonVariants({ variant: 'outline', size: 'lg' })}>
						Explore Setups
					</a>
				</div>
				<p class="mt-4 text-xs text-muted-foreground">
					Free and open source. GitHub account required.
				</p>
			</div>

			<!-- Right: decorative setup.json mock -->
			<div class="relative hidden lg:block">
				<div class="rounded-lg border border-border bg-card p-5 font-mono text-sm shadow-xl">
					<div class="mb-3 flex items-center gap-2">
						<span class="size-3 rounded-full bg-destructive/60"></span>
						<span class="size-3 rounded-full bg-yellow-400/60"></span>
						<span class="size-3 rounded-full bg-green-500/60"></span>
						<span class="ml-2 text-xs text-muted-foreground">coati.json</span>
					</div>
					<pre class="leading-relaxed text-foreground/90"><span class="text-muted-foreground"
							>{LBRACE}</span
						>
  <span class="text-blue-500 dark:text-blue-400">"name"</span>: <span
							class="text-green-600 dark:text-green-400">"my-claude-setup"</span
						>,
  <span class="text-blue-500 dark:text-blue-400">"version"</span>: <span
							class="text-green-600 dark:text-green-400">"1.0.0"</span
						>,
  <span class="text-blue-500 dark:text-blue-400">"description"</span>: <span
							class="text-green-600 dark:text-green-400">"Full-stack TypeScript workflow"</span
						>,
  <span class="text-blue-500 dark:text-blue-400">"tools"</span>: [<span
							class="text-green-600 dark:text-green-400">"claude-code"</span
						>, <span class="text-green-600 dark:text-green-400">"eslint"</span>, <span
							class="text-green-600 dark:text-green-400">"prettier"</span
						>],
  <span class="text-blue-500 dark:text-blue-400">"files"</span>: <span class="text-muted-foreground"
							>{LBRACE}</span
						>
    <span class="text-blue-500 dark:text-blue-400">"CLAUDE.md"</span>: <span
							class="text-green-600 dark:text-green-400">"configs/CLAUDE.md"</span
						>,
    <span class="text-blue-500 dark:text-blue-400">".cursorrules"</span>: <span
							class="text-green-600 dark:text-green-400">"configs/.cursorrules"</span
						>
  <span class="text-muted-foreground">{RBRACE}</span>
<span class="text-muted-foreground">{RBRACE}</span></pre>
				</div>
				<!-- Subtle decorative element behind the card -->
				<div
					class="absolute -right-6 -top-6 -z-10 size-48 rounded-full bg-primary/5 blur-2xl"
				></div>
			</div>
		</div>
	</section>

	<!-- Trending Setups -->
	<section class="mx-auto max-w-7xl px-4 py-10 lg:py-16">
		<div class="mb-6 flex items-baseline justify-between lg:mb-8">
			<h2 class="text-xl font-bold tracking-tight lg:text-2xl">Trending Setups</h2>
			<a
				href="/explore?sort=trending"
				class="text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				View all &rarr;
			</a>
		</div>

		{#if data.trendingSetups.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each data.trendingSetups as setup (setup.id)}
					<SetupCard {setup} username={setup.ownerUsername} showAuthor />
				{/each}
			</div>
		{:else}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<p class="text-muted-foreground">No setups yet. Be the first to share one!</p>
			</div>
		{/if}
	</section>

	<!-- How It Works -->
	<section class="border-t border-border bg-muted/30">
		<div class="mx-auto max-w-7xl px-4 py-10 lg:py-16">
			<h2 class="mb-6 text-center text-xl font-bold tracking-tight lg:mb-10 lg:text-2xl">
				How it works
			</h2>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10"
					>
						<Upload class="size-6 text-primary" />
					</div>
					<h3 class="text-base font-semibold">Share</h3>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						Package your AI coding config, tools, and workflows into a shareable setup.
					</p>
				</div>

				<div class="text-center">
					<div
						class="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10"
					>
						<Search class="size-6 text-primary" />
					</div>
					<h3 class="text-base font-semibold">Discover</h3>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						Browse trending setups from the developer community and find what works.
					</p>
				</div>

				<div class="text-center">
					<div
						class="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10"
					>
						<Download class="size-6 text-primary" />
					</div>
					<h3 class="text-base font-semibold">Clone</h3>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
						Install any setup to your machine with a single command from the CLI.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="border-t border-border">
		<div class="mx-auto max-w-7xl px-4 py-10 text-center lg:py-16">
			<h2 class="text-xl font-bold tracking-tight lg:text-2xl">Ready to share your workflow?</h2>
			<p
				class="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground lg:mt-4 lg:text-base"
			>
				Join the community, publish your setup, and help other developers level up their AI coding
				environment.
			</p>
			<div class="mt-6 flex flex-wrap justify-center gap-3 lg:mt-8">
				<a href="/auth/login/github" class={buttonVariants({ variant: 'default', size: 'lg' })}>
					Get started for free
				</a>
				<a href="/explore" class={buttonVariants({ variant: 'outline', size: 'lg' })}>
					Browse setups
				</a>
			</div>
		</div>
	</section>
{/if}
