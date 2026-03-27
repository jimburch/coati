<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import SetupJsonMock from '$lib/components/SetupJsonMock.svelte';
	import TerminalDemo from '$lib/components/TerminalDemo.svelte';
	import FeatureCard from '$lib/components/FeatureCard.svelte';
	import SectionHeading from '$lib/components/SectionHeading.svelte';
	import BrowserMockup from '$lib/components/BrowserMockup.svelte';
	import {
		Upload,
		Search,
		Download,
		Terminal,
		Users,
		Video,
		Star,
		GitFork,
		Copy
	} from '@lucide/svelte';

	const jsonLdScript =
		'<script type="application/ld+json">' +
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'Coati',
			url: 'https://coati.sh',
			description:
				'Discover, clone, and run complete AI coding workflows. Like GitHub for your AI dev setup.'
		}) +
		'</' +
		'script>';
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
	{@html jsonLdScript}
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden">
	<!-- Gradient glow -->
	<div
		class="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/6 blur-3xl"
	></div>

	<div
		class="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-24 sm:px-6 md:grid-cols-2 md:gap-20 md:pt-32"
	>
		<!-- Left: copy -->
		<div>
			<h1 class="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
				Elite AI Coding Setups.
				<span class="text-primary">Yours to Use &&nbsp;Share.</span>
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

		<!-- Right: setup.json mock (desktop) -->
		<div class="hidden md:block">
			<SetupJsonMock />
		</div>
	</div>

	<!-- Mobile: compact terminal demo -->
	<div class="mx-auto max-w-sm px-4 pb-16 md:hidden">
		<TerminalDemo />
	</div>
</section>

<!-- Problem -->
<section class="border-t border-border/50 bg-card/50">
	<div class="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-24">
		<h2 class="text-3xl font-bold tracking-tight">Sharing AI workflows is still a&nbsp;mess</h2>
		<div class="mx-auto mt-6 max-w-2xl space-y-4 text-lg leading-relaxed text-muted-foreground">
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
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<SectionHeading
			title="One command. Entire workflow."
			subtitle="Coati packages everything — configs, scripts, MCP servers, skills, docs — into a single shareable setup. Clone any developer's complete workflow instantly."
		/>
		<div class="mx-auto max-w-2xl">
			<TerminalDemo />
		</div>
	</div>
</section>

<!-- Screenshots / Preview -->
<section class="border-t border-border/50 bg-card/50">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<SectionHeading
			title="See what's coming"
			subtitle="A preview of the Coati platform — browse setups, see what's inside, and clone in one click."
		/>
		<div class="grid grid-cols-1 gap-6 lg:gap-8">
			<!-- Explore page mockup -->
			<BrowserMockup url="coati.sh/explore">
				<div class="p-4 sm:p-6">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-sm font-semibold text-foreground">Trending setups</h3>
						<div class="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
							<Search class="mr-1 inline size-3" />Search setups...
						</div>
					</div>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each [{ name: 'typescript-fullstack', author: 'jsmith', stars: 342, tools: ['claude-code', 'eslint'], desc: 'Full-stack TypeScript workflow with Claude Code' }, { name: 'python-ml-pipeline', author: 'datadev', stars: 218, tools: ['cursor', 'pytest'], desc: 'ML development setup with Cursor AI' }, { name: 'react-nextjs-pro', author: 'webcraft', stars: 189, tools: ['copilot', 'prettier'], desc: 'Next.js production-ready workflow' }, { name: 'rust-systems', author: 'ferris42', stars: 156, tools: ['claude-code', 'clippy'], desc: 'Systems programming with Claude Code' }, { name: 'go-microservices', author: 'gopher', stars: 134, tools: ['cursor', 'golangci'], desc: 'Go microservices development workflow' }, { name: 'devops-infra', author: 'cloudops', stars: 97, tools: ['claude-code', 'terraform'], desc: 'Infrastructure as code with AI assistance' }] as card (card.name)}
							<div class="rounded-lg border border-border bg-background p-3">
								<div class="flex items-start justify-between">
									<div>
										<p class="text-xs font-semibold text-foreground">{card.name}</p>
										<p class="text-[10px] text-muted-foreground">@{card.author}</p>
									</div>
									<span class="flex items-center gap-0.5 text-[10px] text-muted-foreground">
										<Star class="size-2.5" />{card.stars}
									</span>
								</div>
								<p class="mt-1.5 text-[10px] leading-snug text-muted-foreground">{card.desc}</p>
								<div class="mt-2 flex gap-1">
									{#each card.tools as tool (tool)}
										<span class="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary"
											>{tool}</span
										>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</BrowserMockup>

			<!-- Two side-by-side mockups -->
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
				<!-- Setup detail page -->
				<BrowserMockup url="coati.sh/jsmith/typescript-fullstack">
					<div class="p-4 sm:p-6">
						<div class="flex items-start justify-between">
							<div>
								<h3 class="text-sm font-semibold text-foreground">typescript-fullstack</h3>
								<p class="text-[10px] text-muted-foreground">by @jsmith</p>
							</div>
							<div class="flex gap-2">
								<button
									class="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground"
								>
									<Star class="size-2.5" />Star
								</button>
								<button
									class="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground"
								>
									<Copy class="size-2.5" />Clone
								</button>
							</div>
						</div>
						<p class="mt-3 text-[11px] leading-relaxed text-muted-foreground">
							Full-stack TypeScript workflow for Claude Code. Includes CLAUDE.md, MCP server
							configs, custom skills, ESLint + Prettier setup, and project templates.
						</p>
						<div class="mt-4 rounded-md border border-border bg-background p-3">
							<p class="mb-2 text-[10px] font-semibold text-foreground">Files included</p>
							<div class="space-y-1 font-mono text-[10px] text-muted-foreground">
								<p>CLAUDE.md</p>
								<p>.claude/settings.json</p>
								<p>.claude/skills/tdd.md</p>
								<p>.cursorrules</p>
								<p>mcp-servers.json</p>
							</div>
						</div>
						<div class="mt-3 flex gap-4 text-[10px] text-muted-foreground">
							<span class="flex items-center gap-1"><Star class="size-2.5" />342 stars</span>
							<span class="flex items-center gap-1"><GitFork class="size-2.5" />1.2k clones</span>
						</div>
					</div>
				</BrowserMockup>

				<!-- Terminal clone output -->
				<BrowserMockup url="Terminal" isTerminal>
					<div class="p-4 font-mono text-xs leading-relaxed sm:p-5">
						<p>
							<span class="text-muted-foreground">$</span>
							<span class="text-foreground"> coati clone jsmith/typescript-fullstack</span>
						</p>
						<p class="mt-2 text-muted-foreground">Fetching setup from coati.sh...</p>
						<p class="mt-2 text-primary">&#10003; Cloned setup.json</p>
						<p class="text-primary">&#10003; Installed 3 MCP servers</p>
						<p class="text-primary">&#10003; Applied .claude/settings.json</p>
						<p class="text-primary">&#10003; Copied CLAUDE.md</p>
						<p class="text-primary">&#10003; Copied .cursorrules</p>
						<p class="text-primary">&#10003; Installed 2 custom skills</p>
						<p class="mt-2 text-foreground">
							Done! Your workspace is ready. <span class="text-muted-foreground">(3.2s)</span>
						</p>
					</div>
				</BrowserMockup>
			</div>
		</div>
	</div>
</section>

<!-- Features -->
<section class="border-t border-border/50">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<SectionHeading title="How it works" />
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
<section class="border-t border-border/50 bg-card/50">
	<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
		<SectionHeading title="Built for AI-native developers" />
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div class="rounded-xl border border-border bg-card p-8">
				<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
					<Terminal class="size-5 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Claude Code users</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Share your CLAUDE.md, MCP servers, custom skills, and hooks. Clone setups that make Claude
					Code even more powerful.
				</p>
			</div>
			<div class="rounded-xl border border-border bg-card p-8">
				<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
					<Users class="size-5 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Cursor & IDE users</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Package your .cursorrules, extensions, and AI configurations. Discover setups tuned for
					your stack and editor.
				</p>
			</div>
			<div class="rounded-xl border border-border bg-card p-8">
				<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
					<Video class="size-5 text-primary" />
				</div>
				<h3 class="text-base font-semibold">Content creators</h3>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Link your audience directly to your setup. One command to clone means no more "how do I
					set this up?" in the comments.
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
		<div class="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-24">
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
