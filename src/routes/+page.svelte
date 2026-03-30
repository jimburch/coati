<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import SetupCard from '$lib/components/SetupCard.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import { Upload, Search, Download } from '@lucide/svelte';

	const { data } = $props();

	const LBRACE = '{';
	const RBRACE = '}';
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
				Package your config files, tools, and automation into shareable setups. Discover what other
				developers are running and clone it in one command.
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
			<div class="absolute -right-6 -top-6 -z-10 size-48 rounded-full bg-primary/5 blur-2xl"></div>
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
				<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
					<Upload class="size-6 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Share</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Package your AI coding config, tools, and workflows into a shareable setup.
				</p>
			</div>

			<div class="text-center">
				<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
					<Search class="size-6 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Discover</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Browse trending setups from the developer community and find what works.
				</p>
			</div>

			<div class="text-center">
				<div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
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
