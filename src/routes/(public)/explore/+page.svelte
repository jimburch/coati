<script lang="ts">
	import SetupCard from '$lib/components/SetupCard.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Explore Setups - Magpie</title>
	<meta name="description" content="Browse AI coding workflows and setups on Magpie." />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8">
	<h1 class="mb-6 text-2xl font-bold">Explore Setups</h1>

	{#if data.setups.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.setups as setup (setup.id)}
				<SetupCard {setup} username={setup.ownerUsername} showAuthor />
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground">No setups yet. Be the first to share one!</p>
	{/if}
</div>
