<script lang="ts">
	import CodeBlock from '$lib/components/CodeBlock.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';

	const sections: { id: string; title: string }[] = [
		{ id: 'overview', title: 'Overview' },
		{ id: 'installation', title: 'Installation' },
		{ id: 'clone', title: 'coati clone' },
		{ id: 'init', title: 'coati init' },
		{ id: 'publish', title: 'coati publish' },
		{ id: 'login', title: 'coati login' },
		{ id: 'logout', title: 'coati logout' },
		{ id: 'global-options', title: 'Global Options' },
		{ id: 'environment-variables', title: 'Environment Variables' },
		{ id: 'telemetry', title: 'Telemetry' }
	];
</script>

<svelte:head>
	<title>CLI Reference · Coati</title>
	<meta
		name="description"
		content="Full reference for the Coati CLI — commands, options, examples, and environment variables."
	/>
</svelte:head>

<OgMeta
	title="CLI Reference · Coati"
	description="Full reference for the Coati CLI — commands, options, examples, and environment variables."
	url="/guide/cli"
	type="website"
	twitterCard="summary"
/>

<div class="mx-auto max-w-7xl px-4 py-8 lg:py-12">
	<!-- Page header -->
	<div class="mb-10 lg:mb-12">
		<p class="mb-2 text-sm text-muted-foreground">
			<a href="/guide" class="underline underline-offset-4 hover:text-foreground">Guide</a>
			<span class="mx-1">/</span>
			<span>CLI Reference</span>
		</p>
		<h1 class="text-3xl font-bold tracking-tight lg:text-4xl">CLI Reference</h1>
		<p class="mt-2 text-muted-foreground">
			Every <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">coati</code
			> command, option, and example — in one place.
		</p>
	</div>

	<div class="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
		<!-- TOC sidebar (desktop only) -->
		<aside class="hidden lg:block" aria-label="Table of contents">
			<nav class="sticky top-20 space-y-1" aria-label="CLI reference sections">
				<p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					On this page
				</p>
				{#each sections as section (section.id)}
					<a
						href="#{section.id}"
						class="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<span>{section.title}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Main content -->
		<div class="min-w-0 space-y-16">
			<!-- Overview -->
			<section id="overview" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Overview</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Use <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati</code
						> to clone setups into your project, publish your own, and run your Coati workflow from the
						terminal.
					</p>
					<p>
						Run <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati</code
						>
						with no arguments for the help menu. Add
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>--help</code
						>
						to any command to see its options — e.g.
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati clone --help</code
						>.
					</p>
				</div>
			</section>

			<!-- Installation -->
			<section id="installation" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Installation</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>Run the CLI directly with npx — no install required:</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock
						code="npx @coati/sh@latest clone username/setup-name"
						language="bash"
						label="Run via npx"
					/>
					<p class="text-muted-foreground">Or install it globally from npm:</p>
					<CodeBlock
						code="npm install -g @coati/sh@latest"
						language="bash"
						label="Install globally"
					/>
					<p class="text-muted-foreground">
						The rest of this page uses the short form (<code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati &lt;cmd&gt;</code
						>). Prefer npx? Swap in
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>npx @coati/sh@latest &lt;cmd&gt;</code
						>.
					</p>
				</div>
			</section>

			<!-- coati clone -->
			<section id="clone" class="scroll-mt-20">
				<h2 class="mb-4 font-mono text-2xl font-bold tracking-tight">coati clone</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Install a setup into your project. Identifiers come in two shapes — user (<code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>username/setup-slug</code
						>) or team (<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>org/team-slug/setup-slug</code
						>). No login needed for public setups.
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati clone <identifier> [options]" language="bash" label="Usage" />
					<h3 class="mt-6 text-lg font-semibold text-foreground">Options</h3>
					<ul class="ml-4 list-disc space-y-2 text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--dry-run</code
							> — Preview the file changes without writing them.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--force</code
							> — Overwrite every conflict without prompting.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--pick</code
							> — Choose which files to install, one by one.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--no-post-install</code
							> — Skip the setup's post-install commands.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--global</code
							>
							— Install to
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>~/.coati/setups/owner/slug</code
							> instead of the current directory.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--project</code
							> — Install to the current working directory (the default).
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--dir &lt;path&gt;</code
							>
							— Install to a specific directory. Overrides
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--global</code
							>
							and
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--project</code
							>.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--project-dir &lt;path&gt;</code
							> — Where project-scoped files land. Defaults to the current directory.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--agent &lt;slug&gt;</code
							> — Install files for a single agent, skipping auto-detection.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--json</code
							> — Emit structured JSON instead of a formatted summary. Useful for scripting.
						</li>
					</ul>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Examples</h3>
					<CodeBlock
						code="coati clone alice/claude-code-starter"
						language="bash"
						label="Clone into the current directory"
					/>
					<CodeBlock
						code="coati clone org/my-team/house-style"
						language="bash"
						label="Clone a team-owned setup"
					/>
					<CodeBlock
						code="coati clone alice/claude-code-starter --dry-run"
						language="bash"
						label="Preview without writing"
					/>
					<CodeBlock
						code="coati clone alice/claude-code-starter --pick"
						language="bash"
						label="Choose files interactively"
					/>
					<CodeBlock
						code="coati clone alice/claude-code-starter --global"
						language="bash"
						label="Install to ~/.coati/setups/"
					/>
					<CodeBlock
						code="coati clone alice/claude-code-starter --agent claude-code"
						language="bash"
						label="Install only files for a specific agent"
					/>
				</div>
			</section>

			<!-- coati init -->
			<section id="init" class="scroll-mt-20">
				<h2 class="mb-4 font-mono text-2xl font-bold tracking-tight">coati init</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Scaffold a <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati.json</code
						>
						in the current directory. The CLI scans for known AI config files (<code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">CLAUDE.md</code
						>,
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>.cursorrules</code
						>, MCP configs, and more), groups them by agent, and walks you through which files to
						include.
					</p>
					<p>
						Nothing is uploaded. <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">init</code
						>
						only writes a local manifest — run
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati publish</code
						> when you're ready to share.
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati init" language="bash" label="Usage" />
					<h3 class="mt-6 text-lg font-semibold text-foreground">Options</h3>
					<p class="text-muted-foreground">
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati init</code
						> has no options — it's fully interactive.
					</p>
				</div>
			</section>

			<!-- coati publish -->
			<section id="publish" class="scroll-mt-20">
				<h2 class="mb-4 font-mono text-2xl font-bold tracking-tight">coati publish</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Ship a new setup, or update an existing one, from the current directory. The CLI reads
						your <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati.json</code
						>, uploads the listed files, and creates or updates the setup on Coati. Requires
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>coati login</code
						>.
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati publish [options]" language="bash" label="Usage" />
					<h3 class="mt-6 text-lg font-semibold text-foreground">Options</h3>
					<ul class="ml-4 list-disc space-y-2 text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--json</code
							> — Emit structured JSON instead of a formatted summary. Useful for scripting.
						</li>
					</ul>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Examples</h3>
					<CodeBlock code="coati publish" language="bash" label="Publish the current directory" />
					<CodeBlock code="coati publish --json" language="bash" label="Publish with JSON output" />
				</div>
			</section>

			<!-- coati login -->
			<section id="login" class="scroll-mt-20">
				<h2 class="mb-4 font-mono text-2xl font-bold tracking-tight">coati login</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Sign in with your GitHub account. The CLI opens a device flow — you'll get a URL and a
						short code to enter on GitHub. Your token lands in <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>~/.coati/config.json</code
						>
						(permissions
						<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">0600</code
						>) and is reused on every future command.
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati login [options]" language="bash" label="Usage" />
					<h3 class="mt-6 text-lg font-semibold text-foreground">Options</h3>
					<ul class="ml-4 list-disc space-y-2 text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--force</code
							> — Re-authenticate even if you're already signed in.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--no-browser</code
							> — Print the device-flow URL instead of opening it automatically.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--json</code
							> — Emit structured JSON instead of a formatted summary. Useful for scripting.
						</li>
					</ul>
					<h3 class="mt-6 text-lg font-semibold text-foreground">Examples</h3>
					<CodeBlock code="coati login" language="bash" label="Sign in" />
					<CodeBlock
						code="coati login --no-browser"
						language="bash"
						label="Sign in without opening a browser"
					/>
					<CodeBlock
						code="coati login --force"
						language="bash"
						label="Force a fresh re-authentication"
					/>
				</div>
			</section>

			<!-- coati logout -->
			<section id="logout" class="scroll-mt-20">
				<h2 class="mb-4 font-mono text-2xl font-bold tracking-tight">coati logout</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						Sign out and clear the token from <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>~/.coati/config.json</code
						>.
					</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock code="coati logout [options]" language="bash" label="Usage" />
					<h3 class="mt-6 text-lg font-semibold text-foreground">Options</h3>
					<ul class="ml-4 list-disc space-y-2 text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>--json</code
							> — Emit structured JSON instead of a formatted summary. Useful for scripting.
						</li>
					</ul>
				</div>
			</section>

			<!-- Global Options -->
			<section id="global-options" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Global Options</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>Work on every command:</p>
					<ul class="ml-4 list-disc space-y-2">
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>-V, --version</code
							> — Print the installed CLI version.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>-h, --help</code
							>
							— Show help. Also works per command — e.g.
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>coati clone --help</code
							>.
						</li>
					</ul>
				</div>
			</section>

			<!-- Environment Variables -->
			<section id="environment-variables" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Environment Variables</h2>
				<div class="space-y-4 text-muted-foreground">
					<ul class="ml-4 list-disc space-y-2">
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>COATI_API_BASE</code
							> — Point the CLI at a different API base URL (e.g. a self-hosted instance).
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>COATI_TELEMETRY=false</code
							> — Turn off crash reporting for the current session.
						</li>
						<li>
							<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
								>DO_NOT_TRACK=1</code
							>
							— The universal opt-out flag (<a
								href="https://consoledonottrack.com"
								class="text-foreground underline underline-offset-4 hover:text-primary"
								rel="noopener"
								target="_blank">consoledonottrack.com</a
							>). Turns off crash reporting too.
						</li>
					</ul>
				</div>
			</section>

			<!-- Telemetry -->
			<section id="telemetry" class="scroll-mt-20">
				<h2 class="mb-4 text-2xl font-bold tracking-tight">Telemetry</h2>
				<div class="space-y-4 text-muted-foreground">
					<p>
						The CLI sends no analytics. It reports only when something crashes — and you can turn
						that off too. The <a
							href="/privacy"
							class="text-foreground underline underline-offset-4 hover:text-primary"
							>privacy policy</a
						> has the full list of what's collected and what's not.
					</p>
					<p>Opt out for a single session with an environment variable:</p>
				</div>
				<div class="mt-4 space-y-4">
					<CodeBlock
						code="DO_NOT_TRACK=1 coati clone owner/setup"
						language="bash"
						label="Universal opt-out"
					/>
					<CodeBlock
						code="COATI_TELEMETRY=false coati publish"
						language="bash"
						label="Coati-specific opt-out"
					/>
					<p class="text-muted-foreground">
						To opt out for good, add this to <code
							class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground"
							>~/.coati/config.json</code
						>:
					</p>
					<CodeBlock code={`{ "telemetry": false }`} language="json" label="~/.coati/config.json" />
				</div>
			</section>
		</div>
	</div>
</div>
