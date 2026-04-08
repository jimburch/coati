<script lang="ts">
	import SetupCard from '$lib/components/SetupCard.svelte';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';

	const { data } = $props();
	const agent = $derived(data.agent);
	const setups = $derived(data.setups);
</script>

<svelte:head>
	<title>{agent.displayName} Setups - Coati</title>
	<meta
		name="description"
		content="Browse {agent.displayName} AI coding workflows and setups on Coati."
	/>
</svelte:head>

<OgMeta
	title="{agent.displayName} Setups - Coati"
	description="Browse {agent.displayName} AI coding workflows and setups on Coati."
	url="/agents/{agent.slug}"
	type="article"
	twitterCard="summary"
/>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-8">
	<!-- Agent header -->
	<div class="mb-6 flex items-start gap-3 lg:mb-8 lg:gap-4">
		<AgentIcon slug={agent.slug} size={48} class="mt-1 shrink-0" />

		<div>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-xl font-bold lg:text-2xl">{agent.displayName}</h1>
				{#if agent.official}
					<span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
						Official
					</span>
				{/if}
			</div>

			{#if agent.website}
				<a
					href={agent.website}
					target="_blank"
					rel="noopener noreferrer"
					class="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm5.843-3.875C6.715 4.148 6.232 4 6 4c-.414 0-.73.12-.955.36-.43.465-.545 1.247-.545 1.64 0 .393.057.7.152.9a.8.8 0 0 0 .36.376c.16.08.338.124.52.124.393 0 .793-.152 1.094-.457.196-.196.38-.457.45-.81h.902c-.07.562-.296 1.05-.683 1.44C6.9 8 6.37 8.2 5.73 8.2c-.408 0-.784-.108-1.12-.33-.336-.22-.59-.534-.755-.938C3.69 6.535 3.6 6.086 3.6 5.593c0-.493.09-.942.255-1.34.164-.405.418-.72.755-.94.337-.22.71-.313 1.12-.313.614 0 1.125.193 1.525.574.4.378.625.893.66 1.543h-.9c-.04-.347-.163-.62-.37-.797Zm5.26 0C12.975 4.148 12.494 4 12.26 4c-.415 0-.73.12-.955.36-.43.465-.546 1.247-.546 1.64 0 .393.058.7.152.9a.8.8 0 0 0 .36.376c.16.08.34.124.52.124.393 0 .793-.152 1.094-.457.197-.196.38-.457.45-.81h.903c-.07.562-.297 1.05-.683 1.44-.396.427-.927.627-1.565.627-.408 0-.783-.108-1.12-.33a2.18 2.18 0 0 1-.756-.938c-.165-.397-.255-.846-.255-1.339 0-.493.09-.942.255-1.34.165-.405.42-.72.756-.94.337-.22.712-.313 1.12-.313.614 0 1.125.193 1.524.574.4.378.626.893.662 1.543h-.903c-.038-.347-.162-.62-.37-.797Z"
						/>
					</svg>
					{agent.website.replace(/^https?:\/\//, '')}
				</a>
			{/if}
		</div>
	</div>

	<!-- Setup count + grid -->
	<div class="mb-4 flex items-baseline justify-between lg:mb-6">
		<h2 class="text-base font-semibold lg:text-lg">Setups</h2>
		<span class="text-sm text-muted-foreground">
			{setups.length}
			{setups.length === 1 ? 'setup' : 'setups'}
		</span>
	</div>

	{#if setups.length > 0}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
			{#each setups as setup (setup.id)}
				<SetupCard {setup} username={setup.ownerUsername} showAuthor />
			{/each}
		</div>
	{:else}
		<div class="py-8 text-center lg:py-12">
			<p class="text-muted-foreground">No setups yet for {agent.displayName}.</p>
			<a href="/explore" class="mt-2 inline-block text-sm text-primary hover:underline">
				Browse all setups
			</a>
		</div>
	{/if}
</div>
