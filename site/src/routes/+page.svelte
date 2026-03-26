<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import SetupJsonMock from '$lib/components/SetupJsonMock.svelte';
	import TerminalDemo from '$lib/components/TerminalDemo.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import { Upload, Search, Download, Terminal, Users, Video } from '@lucide/svelte';
</script>

<svelte:head>
	<title>Coati - Discover and Clone AI Coding Workflows</title>
	<meta
		name="description"
		content="The best AI coding setups exist — now you can use them. Discover, clone, and run complete developer workflows for Claude Code, Cursor, Copilot, and more with a single command."
	/>
	<link rel="canonical" href="https://coati.sh" />

	<!-- Open Graph -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://coati.sh" />
	<meta property="og:title" content="Coati - Discover and Clone AI Coding Workflows" />
	<meta
		property="og:description"
		content="The best AI coding setups exist — now you can use them. Discover and clone complete developer workflows with a single command."
	/>
	<meta property="og:image" content="https://coati.sh/og.png" />

	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Coati - Discover and Clone AI Coding Workflows" />
	<meta
		name="twitter:description"
		content="The best AI coding setups exist — now you can use them. Discover and clone complete developer workflows with a single command."
	/>
	<meta name="twitter:image" content="https://coati.sh/og.png" />

	<!-- JSON-LD -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: 'Coati',
		url: 'https://coati.sh',
		description:
			'Discover, clone, and run complete AI coding workflows. Like GitHub for your AI dev setup.'
	})}</script>`}
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<!-- Gradient glow -->
	<div
		class="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl"
	></div>

	<div
		class="mx-auto grid max-w-5xl items-center gap-12 px-4 pb-20 pt-20 md:grid-cols-2 md:gap-16 md:pt-28"
	>
		<!-- Left: copy -->
		<div>
			<h1 class="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
				The best AI coding setups exist.
				<span class="text-primary">Now you can use&nbsp;them.</span>
			</h1>
			<p class="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
				Developers are building incredible workflows with Claude Code, Cursor, and Copilot. Coati
				lets you discover their complete setup and clone it to your machine in one command.
			</p>
			<div class="mt-8">
				<EmailSignup />
			</div>
			<p class="mt-3 text-xs text-muted-foreground">
				Free and open source. Be the first to know when we launch.
			</p>
		</div>

		<!-- Right: setup.json mock -->
		<div class="hidden md:block">
			<SetupJsonMock />
		</div>
	</div>
</section>

<!-- Problem -->
<section class="border-t border-border/50 bg-card/50">
	<div class="mx-auto max-w-3xl px-4 py-20 text-center">
		<h2 class="text-3xl font-bold tracking-tight">
			Sharing AI workflows is still a&nbsp;mess
		</h2>
		<div class="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
			<p>
				Someone posts their Claude Code setup on Twitter. It looks amazing. But recreating it means
				hunting through screenshots, copying config snippets, manually installing MCP servers, and
				hoping you didn't miss anything.
			</p>
			<p>
				Dotfiles repos help, but they weren't built for AI tooling. They don't capture MCP configs,
				custom skills, project-specific prompts, or the context that makes a workflow actually work.
			</p>
		</div>
	</div>
</section>

<!-- Solution -->
<section class="border-t border-border/50">
	<div class="mx-auto max-w-5xl px-4 py-20">
		<SectionHeading
			title="One command. Entire workflow."
			subtitle="Coati packages everything — configs, scripts, MCP servers, skills, docs — into a single shareable setup. Clone any developer's complete workflow instantly."
		/>
		<div class="mx-auto max-w-2xl">
			<TerminalDemo />
		</div>
	</div>
</section>

<!-- Features -->
<section class="border-t border-border/50 bg-card/50">
	<div class="mx-auto max-w-5xl px-4 py-20">
		<SectionHeading title="How it works" />
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			<FeatureCard
				icon={Search}
				title="Discover"
				description="Browse trending setups from the developer community. Filter by tool, language, or use case to find what fits your workflow."
			/>
			<FeatureCard
				icon={Download}
				title="Clone"
				description="Install any setup to your machine with a single CLI command. Configs, MCP servers, skills — everything lands in the right place."
			/>
			<FeatureCard
				icon={Upload}
				title="Share"
				description="Package your own workflow into a setup.json and publish it. Let other developers benefit from what you've built."
			/>
			<FeatureCard
				icon={Terminal}
				title="CLI-first"
				description="Search, clone, star, and publish directly from your terminal. The Coati CLI integrates into the workflow you already have."
			/>
		</div>
	</div>
</section>

<!-- Who it's for -->
<section class="border-t border-border/50">
	<div class="mx-auto max-w-5xl px-4 py-20">
		<SectionHeading title="Built for AI-native developers" />
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="rounded-xl border border-border bg-card p-6">
				<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
					<Terminal class="size-5 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Claude Code users</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Share your CLAUDE.md, MCP servers, custom skills, and hooks. Clone setups that make Claude
					Code even more powerful.
				</p>
			</div>
			<div class="rounded-xl border border-border bg-card p-6">
				<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
					<Users class="size-5 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Cursor & IDE users</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Package your .cursorrules, extensions, and AI configurations. Discover setups tuned for
					your stack and editor.
				</p>
			</div>
			<div class="rounded-xl border border-border bg-card p-6">
				<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
					<Video class="size-5 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Content creators</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Link your audience directly to your setup. One command to clone means no more "how do I set
					this up?" in the comments.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- CTA -->
<section id="signup" class="border-t border-border/50">
	<div
		class="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background"
	>
		<div class="mx-auto max-w-3xl px-4 py-20 text-center">
			<h2 class="text-3xl font-bold tracking-tight">
				Be the first to know when Coati&nbsp;launches
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				Join the waitlist and get early access to the platform and CLI.
			</p>
			<div class="mt-8 flex justify-center">
				<EmailSignup />
			</div>
		</div>
	</div>
</section>
