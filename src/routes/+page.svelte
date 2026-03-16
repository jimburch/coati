<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator';
	import SetupCard from '$lib/components/SetupCard.svelte';

	const { data } = $props();
</script>

<svelte:head>
	<title>Magpie - Share AI Coding Workflows</title>
	<meta name="description" content="Discover, share, and clone AI coding workflows and setups." />
</svelte:head>

<!-- Hero -->
<section class="py-20 text-center">
	<div class="mx-auto max-w-2xl px-4">
		<h1 class="text-4xl font-bold tracking-tight md:text-5xl">Share your AI coding workflows</h1>
		<p class="mt-4 text-lg text-muted-foreground">
			Discover and clone ready-to-use setups for Claude Code, Cursor, Copilot, and more.
		</p>
		<div class="mt-8 flex justify-center gap-3">
			{#if data.user}
				<a href="/explore" class={buttonVariants({ variant: 'default' })}>Explore Setups</a>
				<a href="/{data.user.username}" class={buttonVariants({ variant: 'outline' })}>
					My Profile
				</a>
			{:else}
				<a href="/auth/login/github" class={buttonVariants({ variant: 'default' })}>
					Sign in with GitHub
				</a>
				<a href="/explore" class={buttonVariants({ variant: 'outline' })}>Explore Setups</a>
			{/if}
		</div>
	</div>
</section>

<Separator />

<!-- Recent Setups -->
<section class="mx-auto max-w-7xl px-4 py-12">
	<h2 class="mb-6 text-xl font-semibold">Recent Setups</h2>

	{#if data.recentSetups.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.recentSetups as setup (setup.id)}
				<SetupCard {setup} username={setup.ownerUsername} showAuthor />
			{/each}
		</div>
		<div class="mt-8 text-center">
			<a href="/explore" class="text-sm text-muted-foreground hover:text-foreground">
				View all setups &rarr;
			</a>
		</div>
	{:else}
		<p class="text-muted-foreground">No setups yet. Be the first to share one!</p>
	{/if}
</section>
