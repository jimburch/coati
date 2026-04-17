<script lang="ts">
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import CodeBlock from '$lib/components/CodeBlock.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';

	const sections = [
		{ id: 'what-is-coati', title: 'What is Coati?' },
		{ id: 'supported-agents', title: 'Supported Agents' },
		{ id: 'discover-setups', title: 'Discover Setups' },
		{ id: 'install-the-cli', title: 'Install the CLI' },
		{ id: 'clone-a-setup', title: 'Clone a Setup' },
		{ id: 'create-your-own-setup', title: 'Create Your Own Setup' },
		{ id: 'publish-to-coati', title: 'Publish to Coati' },
		{ id: 'private-setups', title: 'Private Setups', beta: true },
		{ id: 'teams', title: 'Teams', beta: true },
		{ id: 'social-features', title: 'Social Features' }
	];

	const supportedAgents = [
		{
			slug: 'claude-code',
			name: 'Claude Code',
			href: '/agents/claude-code',
			description: "Anthropic's CLI agent for coding in the terminal"
		},
		{
			slug: 'cursor',
			name: 'Cursor',
			href: '/agents/cursor',
			description: 'AI-powered code editor with rules, commands, and MCP'
		},
		{
			slug: 'codex',
			name: 'Codex',
			href: '/agents/codex',
			description: "OpenAI's CLI coding agent"
		},
		{
			slug: 'copilot',
			name: 'GitHub Copilot',
			href: '/agents/copilot',
			description: 'AI pair programmer built into VS Code and GitHub'
		},
		{
			slug: 'gemini',
			name: 'Gemini CLI',
			href: '/agents/gemini',
			description: "Google's CLI agent for coding with Gemini models"
		},
		{
			slug: 'opencode',
			name: 'OpenCode',
			href: '/agents/opencode',
			description: 'Open-source terminal coding agent'
		}
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
						class="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<span>{section.title}</span>
						{#if section.beta}
							<span
								class="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
							>
								Beta
							</span>
						{/if}
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
						Coati is where developers share and discover AI coding setups. A <strong
							class="text-foreground">setup</strong
						>
						is a packaged collection of config files, scripts, hooks, skills, commands, and documentation
						for tools like Claude Code, Cursor, or Codex.
					</p>
					<p>
						Got a <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>CLAUDE.md</code
						> you're proud of? Built custom slash commands or hooks? Coati lets you share that work and
						pick up setups from other developers in seconds.
					</p>
				</div>
			</section>

			<!-- Section 2: Supported Agents -->
			<section id="supported-agents" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Supported Agents</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Coati supports setups for these AI coding agents. Each one has its own config file
						patterns, commands, and conventions.
					</p>
				</div>
				<div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each supportedAgents as agent (agent.slug)}
						<a
							href={agent.href}
							class="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
						>
							<AgentIcon slug={agent.slug} size={28} />
							<div class="min-w-0">
								<p class="text-sm font-medium text-foreground">{agent.name}</p>
								<p class="text-xs text-muted-foreground">{agent.description}</p>
							</div>
						</a>
					{/each}
				</div>
			</section>

			<!-- Section 3: Discover Setups -->
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
						Each setup page shows the manifest, all config files, and a description from the author.
						Star the ones you like to save them to your profile.
					</p>
					<p>
						The <strong class="text-foreground">trending</strong> feed shows what's popular this
						week. Check <strong class="text-foreground">newest</strong> for fresh uploads.
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
						> CLI lets you clone setups into your project, publish your own, and interact with Coati from
						the terminal. You can run it directly with npx — no install required:
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock
						code="npx @coati/sh@latest clone username/setup-name"
						language="bash"
						label="Run via npx (no login needed)"
					/>
					<p class="text-muted-foreground">Or install it globally from npm:</p>
					<CodeBlock
						code="npm install -g @coati/sh@latest"
						language="bash"
						label="Install globally from npm"
					/>
					<p class="text-muted-foreground">
						You can clone any setup without logging in. If you want to <strong
							class="text-foreground">publish</strong
						>
						setups, <strong class="text-foreground">star</strong> setups, or
						<strong class="text-foreground">follow</strong> developers, you'll need to authenticate:
					</p>
					<CodeBlock code="npx @coati/sh@latest login" language="bash" label="Login via npx" />
					<CodeBlock code="coati login" language="bash" label="Login via global install" />
					<p class="text-muted-foreground">
						The <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>login</code
						>
						command starts a device flow: you'll be shown a URL and a short code to enter on GitHub. After
						authenticating, your token is stored at
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>~/.coati/config.json</code
						> and used automatically for future commands.
					</p>
				</div>
			</section>

			<!-- Section 4: Clone a Setup -->
			<section id="clone-a-setup" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Clone a Setup</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>Found a setup you want to use? Clone it straight from the terminal:</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock
						code="npx @coati/sh@latest clone username/setup-name"
						language="bash"
						label="Clone via npx"
					/>
					<CodeBlock
						code="coati clone username/setup-name"
						language="bash"
						label="Clone via global install"
					/>
					<p class="text-muted-foreground">The CLI will ask where you want to place the files:</p>
					<ul class="ml-4 list-disc space-y-2 text-muted-foreground">
						<li>
							<strong class="text-foreground">Project (current directory)</strong> — writes files into
							your working directory, ideal for project-specific setups.
						</li>
						<li>
							<strong class="text-foreground">Global (home folder)</strong> — writes files into your
							home directory (<code
								class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">~</code
							>), useful for setups you want available across all your projects.
						</li>
					</ul>
					<p class="text-muted-foreground">
						If any file already exists at the target location, you'll be prompted to confirm before
						overwriting. No login is required to clone — just run the command and go.
					</p>
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
						> manifest, which is the core of every setup:
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="npx @coati/sh@latest init" language="bash" label="Scaffold via npx" />
					<CodeBlock code="coati init" language="bash" label="Scaffold via global install" />
					<p class="text-muted-foreground">
						The generated manifest describes your setup and lists the files to include:
					</p>
					<CodeBlock
						code={`{
  "name": "my-setup",
  "display": "My Setup",
  "description": "My AI coding workflow for TypeScript projects",
  "category": "web-dev",
  "agents": ["claude-code"],
  "tags": ["typescript", "claude-code"],
  "files": [
    {
      "path": "CLAUDE.md",
      "componentType": "instruction",
      "agent": "claude-code"
    },
    {
      "path": ".claude/commands/commit.md",
      "componentType": "command",
      "agent": "claude-code"
    },
    {
      "path": ".claude/hooks/pre-tool.sh",
      "componentType": "hook",
      "agent": "claude-code"
    }
  ]
}`}
						language="json"
						label="coati.json"
					/>
					<p class="text-muted-foreground">
						Add any files you want to bundle: config files, slash commands, hooks, scripts, or
						documentation. Then reference them in the <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">files</code
						>
						array. Files included in the array must have the correct path and be present in your directory
						and match where they are on disk.
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
					<CodeBlock code="npx @coati/sh@latest publish" language="bash" label="Publish via npx" />
					<CodeBlock code="coati publish" language="bash" label="Publish via global install" />
					<p class="text-muted-foreground">
						The CLI reads your manifest, uploads all listed files, and creates (or updates) your
						setup on Coati. Your setup will be immediately visible on your profile and in the
						Explore page.
					</p>
					<p class="text-muted-foreground">
						To update a published setup's files, edit them locally and run <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati publish</code
						> again. It will overwrite the current version.
					</p>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Editing your setup on the web</h3>
					<p class="text-muted-foreground">
						You can also edit details about your setup directly on the platform. From your setup's
						page, you'll find two editable sections:
					</p>
					<ul class="ml-4 list-disc space-y-2 text-muted-foreground">
						<li>
							<strong class="text-foreground">README</strong> — a Markdown document displayed prominently
							on your setup page. Use it to explain what your setup does, how to customize it, and any
							tips for getting the most out of it.
						</li>
						<li>
							<strong class="text-foreground">About</strong> — a short description and metadata shown
							in the sidebar. This is what people see when browsing the Explore page or your profile.
						</li>
					</ul>
					<p class="text-muted-foreground">
						These sections are edited on the web — no CLI publish needed. Great for updating docs
						without touching your config files.
					</p>
				</div>
			</section>

			<!-- Section: Private Setups -->
			<section id="private-setups" class="scroll-mt-20">
				<div class="mb-4 flex flex-wrap items-center gap-3">
					<h2 class="text-2xl font-bold tracking-tight">Private Setups</h2>
					<span
						class="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary"
					>
						Beta
					</span>
				</div>
				<div class="space-y-4 text-muted-foreground">
					<p class="rounded-md border border-border bg-muted/50 p-4 text-sm">
						<strong class="text-foreground">Beta access required.</strong> Private setups are in
						closed beta. You'll need beta access on your account before you can create them or use
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>--private</code
						> on publish. Want in? Request access from the feedback widget.
					</p>
					<p>
						Not every setup is meant for the world. A <strong class="text-foreground"
							>private setup</strong
						> keeps your work off the Explore page, out of search, and out of trending. Only you, the
						people you share it with, and your team members (if it belongs to a team) can see or clone
						it.
					</p>
					<p>Use private setups for:</p>
					<ul class="ml-4 list-disc space-y-2">
						<li>
							<strong class="text-foreground">Work in progress.</strong> Iterate on a setup without publishing
							it to the world.
						</li>
						<li>
							<strong class="text-foreground">Company configs.</strong> Internal workflows, house style
							guides, and proprietary prompts that shouldn't leave the building.
						</li>
						<li>
							<strong class="text-foreground">Personal dotfiles.</strong> Your own rig, shared with a
							small circle of friends.
						</li>
					</ul>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Publish a setup as private</h3>
					<p>
						Pass the <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>--private</code
						> flag when you publish:
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati publish --private" language="bash" label="Publish as private" />
					<p class="text-muted-foreground">
						You can flip visibility later from the setup's settings page on the web. Switching from
						public to private hides it immediately. Switching back makes it discoverable again.
					</p>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Share a private setup</h3>
					<p class="text-muted-foreground">
						Open the setup's settings and add collaborators by username. They'll see the setup on
						their dashboard and can clone it like any other. Revoke access at any time.
					</p>
					<p class="text-muted-foreground">
						Prefer to share with a whole group at once? Assign the setup to a <a
							href="#teams"
							class="text-foreground underline underline-offset-4 hover:text-primary">team</a
						>. Every team member gets access automatically.
					</p>
				</div>
			</section>

			<!-- Section: Teams -->
			<section id="teams" class="scroll-mt-20">
				<div class="mb-4 flex flex-wrap items-center gap-3">
					<h2 class="text-2xl font-bold tracking-tight">Teams</h2>
					<span
						class="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary"
					>
						Beta
					</span>
				</div>
				<div class="space-y-4 text-muted-foreground">
					<p class="rounded-md border border-border bg-muted/50 p-4 text-sm">
						<strong class="text-foreground">Beta access required.</strong> Teams are in closed beta. You'll
						need beta access on your account before you can create a team or accept an invite. Request
						access from the feedback widget.
					</p>
					<p>
						A <strong class="text-foreground">team</strong> is a shared home for setups. Create one for
						your company, your open-source project, or any group that wants a common set of configs. Every
						team member can view and clone every team setup, public or private, no individual sharing
						required.
					</p>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Create a team</h3>
					<p>
						Head to <a
							href="/teams"
							class="text-foreground underline underline-offset-4 hover:text-primary"
							>your teams page</a
						>
						and click <strong class="text-foreground">New team</strong>. Pick a name and a slug. The
						slug becomes the team's URL at
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>/org/your-slug</code
						>.
					</p>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Invite members</h3>
					<p>
						From the team page, open <strong class="text-foreground">Members</strong> and send an invite
						by Coati username or email. Invitees see pending invites on their dashboard and can accept
						or decline. Members come in two roles:
					</p>
					<ul class="ml-4 list-disc space-y-2">
						<li>
							<strong class="text-foreground">Admin.</strong> Can manage members, send invites, and edit
							team settings.
						</li>
						<li>
							<strong class="text-foreground">Member.</strong> Can view and contribute to team setups.
						</li>
					</ul>
					<p>
						The user who creates the team is the <strong class="text-foreground">owner</strong> and always
						has full control.
					</p>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Add setups to a team</h3>
					<p>
						From a setup's settings page, choose a team under <strong class="text-foreground"
							>Ownership</strong
						>. The setup stays under your username, but every team member gets access. This works
						for public and private setups alike.
					</p>
					<p>
						Public team setups still show up in Explore and on your profile. Private team setups
						stay hidden but are visible to the whole team.
					</p>
				</div>
			</section>

			<!-- Section 7: Social Features -->
			<section id="social-features" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Social Features</h2>
				<div class="space-y-4 text-muted-foreground">
					<ul class="ml-4 list-disc space-y-2">
						<li>
							<strong class="text-foreground">Stars:</strong> Save setups to your profile and help others
							find the good ones.
						</li>
						<li>
							<strong class="text-foreground">Follows:</strong> Follow developers you like. Their new
							setups show up in your feed.
						</li>
						<li>
							<strong class="text-foreground">Activity feed:</strong> See what the people you follow are
							up to. Available from your dashboard after signing in.
						</li>
					</ul>
				</div>
			</section>
		</div>
	</div>
</div>
