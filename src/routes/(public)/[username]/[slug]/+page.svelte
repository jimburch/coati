<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import StarButton from '$lib/components/StarButton.svelte';
	import CommentThread from '$lib/components/CommentThread.svelte';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import { timeAgo } from '$lib/utils';

	const { data } = $props();

	let copied = $state(false);
	let showComments = $state(false);
	const cloneCommand = $derived(`coati clone ${data.setup.ownerUsername}/${data.setup.slug}`);

	// Optimistic override for stars count — set on button click, cleared when server data refreshes.
	let starsCountOverride = $state<number | null>(null);
	const localStarsCount = $derived(starsCountOverride ?? data.setup.starsCount);
	$effect(() => {
		// When revalidation brings fresh server data, drop the optimistic override.
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		data.setup.starsCount;
		starsCountOverride = null;
	});

	const fileGroups = $derived(
		(() => {
			const agentGroups = data.agents
				.map((agent) => ({
					agent,
					count: data.files.filter((f) => f.agent === agent.slug).length
				}))
				.filter((g) => g.count > 0);

			const sharedCount = data.files.filter((f) => !f.agent).length;
			return { agentGroups, sharedCount };
		})()
	);

	function copyCloneCommand() {
		navigator.clipboard.writeText(cloneCommand);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>{data.setup.name} by {data.setup.ownerUsername} - Coati</title>
	<meta name="description" content={data.setup.description} />
</svelte:head>

<OgMeta
	title="{data.setup.name} by {data.setup.ownerUsername} - Coati"
	description={data.setup.description}
	url="/{data.setup.ownerUsername}/{data.setup.slug}"
	type="article"
	twitterCard="summary_large_image"
/>

<div class="mx-auto max-w-5xl px-4 py-6 lg:py-8">
	<!-- Header -->
	<div class="mb-4 lg:mb-6">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<h1 class="text-xl font-bold lg:text-2xl">{data.setup.name}</h1>
				<p class="mt-1 text-sm text-muted-foreground lg:text-base">{data.setup.description}</p>
			</div>
			<span
				class="shrink-0 rounded-md bg-secondary px-2.5 py-0.5 text-sm font-medium text-secondary-foreground"
			>
				v{data.setup.version}
			</span>
		</div>
	</div>

	<Separator class="mb-6 lg:mb-8" />

	<!-- Two-column layout -->
	<div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
		<!-- Main content -->
		<div class="min-w-0 flex-1">
			{#if data.readmeHtml}
				<div class="prose dark:prose-invert max-w-none">
					{@html data.readmeHtml}
				</div>
			{:else}
				<div class="rounded-lg border border-border bg-card p-6 text-center lg:p-8">
					<p class="text-sm text-muted-foreground">No README found for this setup.</p>
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="w-full shrink-0 lg:w-72">
			<div class="space-y-6">
				<!-- Author -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Author</h3>
					<a href="/{data.setup.ownerUsername}" class="flex items-center gap-2 hover:underline">
						<Avatar class="size-6">
							<AvatarImage src={data.setup.ownerAvatarUrl} alt={data.setup.ownerUsername} />
							<AvatarFallback>{data.setup.ownerUsername[0].toUpperCase()}</AvatarFallback>
						</Avatar>
						<span class="text-sm font-medium">{data.setup.ownerUsername}</span>
					</a>
				</div>

				<!-- Star button -->
				<div>
					<StarButton
						isStarred={data.isStarred}
						starsCount={data.setup.starsCount}
						onoptimisticchange={(count) => {
							starsCountOverride = count;
						}}
					/>
				</div>

				<!-- Stats -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Stats</h3>
					<div class="space-y-1 text-sm">
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Stars</span>
							<span>{localStarsCount}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Clones</span>
							<span>{data.setup.clonesCount}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Updated</span>
							<span>{timeAgo(data.setup.updatedAt)}</span>
						</div>
					</div>
				</div>

				<!-- Agents -->
				{#if data.agents.length > 0}
					<div>
						<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Agents</h3>
						<div class="flex flex-wrap gap-1.5">
							{#each data.agents as agent (agent.id)}
								<a
									href="/agents/{agent.slug}"
									class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
								>
									<AgentIcon slug={agent.slug} size={12} />
									{agent.displayName}
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Tags -->
				{#if data.tags.length > 0}
					<div>
						<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Tags</h3>
						<div class="flex flex-wrap gap-1.5">
							{#each data.tags as tag (tag.id)}
								<span class="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">
									{tag.name}
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Clone command -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Clone</h3>
					<div class="flex items-center gap-1 rounded-md border border-border bg-muted p-2">
						<code class="flex-1 truncate text-xs">{cloneCommand}</code>
						<button
							onclick={copyCloneCommand}
							class="shrink-0 rounded p-1 hover:bg-accent"
							aria-label="Copy clone command"
						>
							{#if copied}
								<svg class="size-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
									<path
										d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
									/>
								</svg>
							{:else}
								<svg class="size-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
									<path
										d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"
									/>
									<path
										d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Files -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Files</h3>
					<div class="space-y-1.5" data-testid="file-groups">
						{#each fileGroups.agentGroups as group (group.agent.slug)}
							<div class="flex items-center gap-2 text-sm" data-testid="agent-group">
								<AgentIcon slug={group.agent.slug} size={16} />
								<span class="font-medium">{group.agent.displayName}</span>
								<span class="ml-auto text-xs text-muted-foreground"
									>{group.count}
									{group.count === 1 ? 'file' : 'files'}</span
								>
							</div>
						{/each}
						{#if fileGroups.sharedCount > 0}
							<div class="flex items-center gap-2 text-sm" data-testid="shared-group">
								<svg
									class="size-4 shrink-0 text-muted-foreground"
									viewBox="0 0 16 16"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"
									/>
								</svg>
								<span class="font-medium">Shared</span>
								<span class="ml-auto text-xs text-muted-foreground"
									>{fileGroups.sharedCount}
									{fileGroups.sharedCount === 1 ? 'file' : 'files'}</span
								>
							</div>
						{/if}
					</div>
					<a
						href="/{data.setup.ownerUsername}/{data.setup.slug}/files"
						class="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
					>
						Browse all {data.files.length}
						{data.files.length === 1 ? 'file' : 'files'} →
					</a>
				</div>
			</div>
		</div>
	</div>

	<Separator class="my-6 lg:my-8" />

	<!-- Mobile comments toggle -->
	<button
		data-testid="show-comments-btn"
		class="w-full py-2 text-left text-sm font-medium lg:hidden"
		onclick={() => (showComments = !showComments)}
	>
		{showComments
			? 'Hide comments'
			: `Show ${data.comments.length} comment${data.comments.length === 1 ? '' : 's'}`}
	</button>

	<!-- Comments: collapsed on mobile by default, always visible on desktop -->
	<div data-testid="comment-thread" class={showComments ? '' : 'hidden lg:block'}>
		<CommentThread
			comments={data.comments}
			isLoggedIn={!!data.user}
			currentUsername={data.user?.username ?? null}
		/>
	</div>
</div>
