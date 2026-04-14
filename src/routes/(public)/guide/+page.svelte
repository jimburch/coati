<script lang="ts">
	import CodeBlock from '$lib/components/CodeBlock.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';

	const sections = [
		{ id: 'what-is-coati', title: 'What is Coati?' },
		{ id: 'discover-setups', title: 'Discover Setups' },
		{ id: 'install-the-cli', title: 'Install the CLI' },
		{ id: 'clone-a-setup', title: 'Clone a Setup' },
		{ id: 'create-your-own-setup', title: 'Create Your Own Setup' },
		{ id: 'publish-to-coati', title: 'Publish to Coati' },
		{ id: 'social-features', title: 'Social Features' }
	];
</script>

<svelte:head>
	<title>How to use Coati</title>
	<meta
		name="description"
		content="Learn how to discover, clone, create, and publish AI coding setups with Coati."
	/>
</svelte:head>

<OgMeta
	title="How to use Coati"
	description="Learn how to discover, clone, create, and publish AI coding setups with Coati."
	url="/guide"
	type="website"
	twitterCard="summary"
/>

<div class="mx-auto max-w-7xl px-4 py-8 lg:py-12">
	<!-- Page header -->
	<div class="mb-10 lg:mb-12">
		<h1 class="text-3xl font-bold tracking-tight lg:text-4xl">How to use Coati</h1>
		<p class="mt-2 text-muted-foreground">
			A guide to discovering, cloning, creating, and sharing AI coding setups.
		</p>
	</div>

	<div class="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
		<!-- TOC sidebar (desktop only) -->
		<aside class="hidden lg:block" aria-label="Table of contents">
			<nav class="sticky top-20 space-y-1" aria-label="Guide sections">
				<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					On this page
				</p>
				{#each sections as section (section.id)}
					<a
						href="#{section.id}"
						class="block rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						{section.title}
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Main content -->
		<div class="min-w-0 space-y-16">
			<!-- Section 1: What is Coati? -->
			<section id="what-is-coati" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">What is Coati?</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Coati is a platform for developers to share, discover, and clone AI coding setups —
						think GitHub, but for your AI workflow. A <strong class="text-foreground">setup</strong>
						is a packaged collection of config files, scripts, hooks, skills, commands, and documentation
						that defines how you work with AI coding tools like Claude Code, Cursor, or Windsurf.
					</p>
					<p>
						Whether you've spent hours tuning a perfect <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">CLAUDE.md</code
						>, built custom slash commands, or wired up a set of hooks — Coati lets you share that
						work with the community and pick up setups from other developers in seconds.
					</p>
				</div>
			</section>

			<!-- Section 2: Discover Setups -->
			<section id="discover-setups" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Discover Setups</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Browse the <a
							href="/explore"
							class="text-foreground underline underline-offset-4 hover:text-primary">Explore</a
						> page to find setups from the community. You can search by keyword, filter by AI agent (Claude
						Code, Cursor, Windsurf, and more), and sort by trending, most-starred, or newest.
					</p>
					<p>
						Each setup page shows you exactly what's included — the manifest, all config files, and
						a description from the author. You can star setups you like to save them to your profile
						and help surface them to others.
					</p>
					<p>
						The <strong class="text-foreground">trending</strong> feed highlights setups gaining the
						most traction this week. New setups worth watching are easy to find under
						<strong class="text-foreground">newest</strong>.
					</p>
				</div>
			</section>

			<!-- Section 3: Install the CLI -->
			<section id="install-the-cli" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Install the CLI</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						The <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati</code
						> CLI lets you clone setups directly into your project, publish your own, and interact with
						Coati from the terminal. Install it globally with npm:
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="npm install -g coati" language="bash" label="Install coati globally" />
					<p class="text-muted-foreground">
						Once installed, authenticate with your Coati account using GitHub OAuth:
					</p>
					<CodeBlock code="coati login" language="bash" label="Authenticate" />
					<p class="text-muted-foreground">
						This starts a device flow: you'll be shown a URL and a short code to enter on GitHub.
						After authenticating, your token is stored at <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>~/.coati/config.json</code
						> and used automatically for future commands.
					</p>
				</div>
			</section>

			<!-- Section 4: Clone a Setup -->
			<section id="clone-a-setup" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Clone a Setup</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>Found a setup you want to use? Clone it into your current project directory:</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati clone username/setup-name" language="bash" label="Clone a setup" />
					<p class="text-muted-foreground">
						The CLI downloads all files listed in the setup's manifest and writes them to your
						working directory. If any file already exists, you'll be prompted to confirm before
						overwriting.
					</p>
					<p class="text-muted-foreground">You can also pass a target directory:</p>
					<CodeBlock
						code="coati clone username/setup-name ./my-project"
						language="bash"
						label="Clone into a specific directory"
					/>
				</div>
			</section>

			<!-- Section 5: Create Your Own Setup -->
			<section id="create-your-own-setup" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Create Your Own Setup</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Start from your existing project or an empty directory. The <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati init</code
						>
						command scaffolds a
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati.json</code
						> manifest — the core of every setup:
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati init" language="bash" label="Scaffold a new setup" />
					<p class="text-muted-foreground">
						The generated manifest describes your setup and lists the files to include:
					</p>
					<CodeBlock
						code={`{
  "name": "my-setup",
  "description": "My AI coding workflow for TypeScript projects",
  "agents": ["claude-code"],
  "files": [
    "CLAUDE.md",
    ".claude/commands/commit.md",
    ".claude/hooks/pre-tool.sh"
  ]
}`}
						language="json"
						label="coati.json"
					/>
					<p class="text-muted-foreground">
						Add any files you want to bundle — config files, slash commands, hooks, scripts, or
						documentation. Then reference them in the <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">files</code
						> array.
					</p>
				</div>
			</section>

			<!-- Section 6: Publish to Coati -->
			<section id="publish-to-coati" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Publish to Coati</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Once your setup is ready and your <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati.json</code
						> is in place, publish it to the platform:
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati publish" language="bash" label="Publish your setup" />
					<p class="text-muted-foreground">
						The CLI reads your manifest, uploads all listed files, and creates (or updates) your
						setup on Coati. Your setup will be immediately visible on your profile and in the
						Explore page.
					</p>
					<p class="text-muted-foreground">
						To update a published setup, edit your files locally and run <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati publish</code
						> again — it will overwrite the current version.
					</p>
				</div>
			</section>

			<!-- Section 7: Social Features -->
			<section id="social-features" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Social Features</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Coati has lightweight social features to help you find great setups and stay connected
						with the developers behind them.
					</p>
					<ul class="ml-4 list-disc space-y-2">
						<li>
							<strong class="text-foreground">Stars</strong> — Star setups to save them to your profile
							and signal quality to the community. Starred setups appear on your profile for others to
							find.
						</li>
						<li>
							<strong class="text-foreground">Follows</strong> — Follow developers whose setups you like.
							Their new setups will appear in your activity feed.
						</li>
						<li>
							<strong class="text-foreground">Activity feed</strong> — See recent activity from people
							you follow: new setups, stars, and more. Access your feed from the dashboard after signing
							in.
						</li>
					</ul>
					<p>You can also star and follow directly from the CLI:</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati star username/setup-name" language="bash" label="Star a setup" />
					<CodeBlock code="coati follow username" language="bash" label="Follow a developer" />
				</div>
			</section>
		</div>
	</div>
</div>
