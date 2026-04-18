<script lang="ts">
	import OgMeta from '$lib/components/OgMeta.svelte';
	import { BMC_URL, GITHUB_REPO_URL } from '$lib/config/support';

	const otherWays: Array<{ emoji: string; label: string; href: string }> = [
		{ emoji: '⭐', label: 'Star the repo on GitHub', href: GITHUB_REPO_URL },
		{
			emoji: '🐞',
			label: 'Report a bug or request a feature',
			href: `${GITHUB_REPO_URL}/issues/new`
		},
		{ emoji: '🤝', label: 'Contribute on GitHub', href: GITHUB_REPO_URL }
	];
</script>

<svelte:head>
	<title>Support Coati</title>
</svelte:head>

<OgMeta
	title="Support Coati"
	description="Coati is free and open source. If it's useful to you, here are some ways to help it keep going."
/>

<div class="mx-auto max-w-2xl px-4 py-12 lg:py-16">
	<h1 class="text-foreground mb-4 text-3xl font-bold tracking-tight lg:text-4xl">Support Coati</h1>
	<p class="text-muted-foreground mb-10 leading-relaxed">
		Coati is free and open source. If it's useful to you, here are some ways to help it keep going.
	</p>

	<div class="mb-12">
		<a href={BMC_URL} target="_blank" rel="noopener noreferrer" data-testid="bmc-button">
			<img
				src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
				alt="Buy me a coffee"
				width="217"
				height="60"
			/>
		</a>
	</div>

	<section>
		<h2 class="text-foreground mb-4 text-xl font-semibold">Other ways to help</h2>
		<ul class="text-muted-foreground space-y-2">
			{#each otherWays as way (way.label)}
				<li>
					<span aria-hidden="true">{way.emoji}</span>
					<a
						href={way.href}
						target="_blank"
						rel="noopener noreferrer"
						class="text-foreground underline hover:no-underline"
					>
						{way.label}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</div>
