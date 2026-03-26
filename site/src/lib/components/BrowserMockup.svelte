<script lang="ts">
	import type { Snippet } from 'svelte';

	const {
		url,
		isTerminal = false,
		children
	}: { url: string; isTerminal?: boolean; children: Snippet } = $props();
</script>

<div class="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
	<!-- Chrome bar -->
	<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
		<span class="size-2.5 rounded-full bg-red-500/60"></span>
		<span class="size-2.5 rounded-full bg-yellow-500/60"></span>
		<span class="size-2.5 rounded-full bg-green-500/60"></span>
		{#if isTerminal}
			<span class="ml-2 text-xs text-muted-foreground">{url}</span>
		{:else}
			<div
				class="ml-2 flex-1 rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground"
			>
				{url}
			</div>
		{/if}
	</div>
	<!-- Content -->
	<div class="bg-card">
		{@render children()}
	</div>
</div>
