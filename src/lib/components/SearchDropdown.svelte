<script lang="ts">
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import AgentIcon from '$lib/components/AgentIcon.svelte';

	type SearchItem = {
		id: string;
		name: string;
		slug: string;
		starsCount: number;
		ownerUsername: string;
		agents: string[];
	};

	let { inputClass = 'h-9 w-64' }: { inputClass?: string } = $props();

	let query = $state('');
	let items = $state<SearchItem[]>([]);
	let isLoading = $state(false);
	let isOpen = $state(false);
	let highlightedIndex = $state(-1);
	let containerEl: HTMLDivElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		const trimmed = query.trim();

		if (trimmed.length < 2) {
			isOpen = false;
			items = [];
			highlightedIndex = -1;
			return;
		}

		debounceTimer = setTimeout(fetchResults, 300);
	}

	async function fetchResults() {
		const trimmed = query.trim();
		if (trimmed.length < 2) return;

		isLoading = true;
		isOpen = true;
		highlightedIndex = -1;

		try {
			const res = await fetch(`/api/v1/setups?q=${encodeURIComponent(trimmed)}&page=1`);
			if (!res.ok) return;
			const json = await res.json();
			items = (json.data?.items ?? []).slice(0, 5);
		} catch {
			items = [];
		} finally {
			isLoading = false;
		}
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) {
			isOpen = false;
			highlightedIndex = -1;
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
		} else {
			document.removeEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	function navigateToResult(username: string, slug: string) {
		isOpen = false;
		highlightedIndex = -1;
		query = '';
		goto(`/${username}/${slug}`);
	}

	function navigateToAll() {
		isOpen = false;
		highlightedIndex = -1;
		const trimmed = query.trim();
		if (trimmed) {
			goto(`/explore?q=${encodeURIComponent(trimmed)}`);
		} else {
			goto('/explore');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			isOpen = false;
			highlightedIndex = -1;
			inputEl?.blur();
			return;
		}

		if (!isOpen) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (items.length === 0) return;
			highlightedIndex =
				highlightedIndex >= items.length - 1 ? items.length - 1 : highlightedIndex + 1;
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (highlightedIndex <= 0) {
				highlightedIndex = -1;
			} else {
				highlightedIndex = highlightedIndex - 1;
			}
			return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			if (highlightedIndex >= 0 && highlightedIndex < items.length) {
				const item = items[highlightedIndex];
				navigateToResult(item.ownerUsername, item.slug);
			} else {
				navigateToAll();
			}
		}
	}
</script>

<div bind:this={containerEl} class="relative">
	<div class="relative">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
		<Input
			bind:ref={inputEl}
			type="search"
			placeholder="Search setups..."
			class="{inputClass} pl-9 pr-8"
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
		/>
		{#if isLoading}
			<span
				class="text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2"
				aria-label="Loading"
			>
				<svg
					class="h-4 w-4 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
			</span>
		{/if}
	</div>

	{#if isOpen}
		<div
			class="bg-popover absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border shadow-lg"
		>
			{#if isLoading && items.length === 0}
				<div class="text-muted-foreground p-4 text-center text-sm">Searching...</div>
			{:else if items.length === 0}
				<div class="text-muted-foreground p-4 text-center text-sm">No results found</div>
			{:else}
				<ul role="listbox">
					{#each items as item, index (item.id)}
						<li role="option" aria-selected={index === highlightedIndex}>
							<button
								class="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors {index ===
								highlightedIndex
									? 'bg-accent'
									: 'hover:bg-accent'}"
								onclick={() => navigateToResult(item.ownerUsername, item.slug)}
							>
								{#if item.agents.length > 0}
									<div class="flex shrink-0 items-center gap-0.5">
										{#each item.agents.slice(0, 2) as agentSlug (agentSlug)}
											<AgentIcon slug={agentSlug} size={16} />
										{/each}
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="text-foreground truncate text-sm font-medium">{item.name}</div>
									<div class="text-muted-foreground truncate text-xs">{item.ownerUsername}</div>
								</div>
								<div class="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
									<svg class="size-3" viewBox="0 0 16 16" fill="currentColor">
										<path
											d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
										/>
									</svg>
									{item.starsCount}
								</div>
							</button>
						</li>
					{/each}
				</ul>
				<div class="border-t px-3 py-2">
					<button class="text-primary text-xs hover:underline" onclick={navigateToAll}>
						View all results for "{query.trim()}"
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
