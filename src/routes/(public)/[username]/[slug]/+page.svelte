<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import StarButton from '$lib/components/StarButton.svelte';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import DeleteSetupDialog from '$lib/components/DeleteSetupDialog.svelte';
	import { enhance } from '$app/forms';
	import { timeAgo } from '$lib/utils';

	const { data } = $props();

	let copied = $state(false);
	let showReportForm = $state(false);
	let reportSubmitting = $state(false);
	const cloneCommand = $derived(
		`npx @coati/sh@latest clone ${data.setup.ownerUsername}/${data.setup.slug}`
	);

	// README editing state
	const isOwner = $derived(!!data.user && data.user.username === data.setup.ownerUsername);
	let editMode = $state(false);
	let editTab = $state<'edit' | 'preview'>('edit');
	let editContent = $state('');
	let saving = $state(false);
	let previewing = $state(false);
	let previewHtml = $state<string | null>(null);
	// Local overrides updated after save
	let localReadmeHtml = $state<string | null>(null);
	let localUpdatedAt = $state<Date | null>(null);

	const displayedReadmeHtml = $derived(
		localReadmeHtml !== null ? localReadmeHtml : data.readmeHtml
	);
	const displayedUpdatedAt = $derived(localUpdatedAt ?? data.setup.updatedAt);

	function startEdit() {
		editContent = data.setup.readme ?? '';
		editTab = 'edit';
		previewHtml = null;
		editMode = true;
	}

	function cancelEdit() {
		editMode = false;
	}

	// Optimistic featured state for admin toggle
	let localFeatured = $state<boolean | null>(null);
	const isFeatured = $derived(localFeatured !== null ? localFeatured : !!data.setup.featuredAt);

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

	let deleteDialogOpen = $state(false);

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
	<!-- Two-column layout -->
	<div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
		<!-- Main content -->
		<div class="min-w-0 flex-1">
			{#if !editMode}
				<!-- View mode -->
				<div class="mb-2 flex items-center justify-between">
					<span class="text-sm font-semibold text-muted-foreground">README</span>
					{#if isOwner}
						<Button variant="outline" size="sm" onclick={startEdit} data-testid="edit-readme-btn">
							Edit
						</Button>
					{/if}
				</div>
				{#if displayedReadmeHtml}
					<div class="prose dark:prose-invert max-w-none [&_pre]:!bg-secondary">
						{@html displayedReadmeHtml}
					</div>
				{:else}
					<div class="rounded-lg border border-border bg-card p-6 text-center lg:p-8">
						<p class="text-sm text-muted-foreground">No README found for this setup.</p>
					</div>
				{/if}
			{:else}
				<!-- Edit mode -->
				<div class="space-y-3" data-testid="readme-editor">
					<!-- Tab bar -->
					<div class="flex items-center gap-2 border-b border-border pb-2">
						<button
							class="rounded-md px-3 py-1 text-sm font-medium transition-colors {editTab === 'edit'
								? 'bg-secondary text-secondary-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => {
								editTab = 'edit';
							}}
							data-testid="tab-edit"
						>
							Edit
						</button>
						<button
							class="rounded-md px-3 py-1 text-sm font-medium transition-colors {editTab ===
							'preview'
								? 'bg-secondary text-secondary-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={async () => {
								editTab = 'preview';
								previewing = true;
								previewHtml = null;
								try {
									const fd = new FormData();
									fd.append('readme', editContent);
									const res = await fetch('?/previewReadme', { method: 'POST', body: fd });
									const json = await res.json();
									previewHtml = json?.data?.previewHtml ?? null;
								} finally {
									previewing = false;
								}
							}}
							data-testid="tab-preview"
						>
							Preview
						</button>
					</div>

					{#if editTab === 'edit'}
						<textarea
							class="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
							rows={20}
							bind:value={editContent}
							data-testid="readme-textarea"
							placeholder="Write your README in Markdown..."
						></textarea>
					{:else}
						<div class="min-h-[200px] rounded-md border border-border bg-card p-4">
							{#if previewing}
								<p class="text-sm text-muted-foreground">Rendering preview...</p>
							{:else if previewHtml}
								<div class="prose dark:prose-invert max-w-none [&_pre]:!bg-secondary">
									{@html previewHtml}
								</div>
							{:else}
								<p class="text-sm italic text-muted-foreground">Nothing to preview.</p>
							{/if}
						</div>
					{/if}

					<!-- Save / Cancel -->
					<form
						method="POST"
						action="?/saveReadme"
						use:enhance={() => {
							saving = true;
							return async ({ result, update }) => {
								saving = false;
								if (result.type === 'success' && result.data) {
									localReadmeHtml = (result.data.readmeHtml as string | null) ?? null;
									localUpdatedAt = result.data.updatedAt
										? new Date(result.data.updatedAt as string)
										: null;
									editMode = false;
								}
								await update({ reset: false });
							};
						}}
					>
						<input type="hidden" name="readme" value={editContent} />
						<div class="flex gap-2">
							<Button type="submit" size="sm" disabled={saving} data-testid="save-readme-btn">
								{saving ? 'Saving…' : 'Save'}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={cancelEdit}
								data-testid="cancel-readme-btn"
							>
								Cancel
							</Button>
						</div>
					</form>
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="w-full shrink-0 lg:w-72">
			<div class="space-y-6">
				<!-- About -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">About</h3>
					<h2 class="text-lg font-semibold">{data.setup.name}</h2>
					<p class="mt-1 text-sm text-muted-foreground">{data.setup.description}</p>
				</div>

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

				<!-- Owner: delete setup -->
				{#if isOwner}
					<div>
						<Button
							variant="outline"
							class="w-full text-destructive/70"
							onclick={() => (deleteDialogOpen = true)}
							data-testid="delete-setup-btn"
						>
							Delete setup
						</Button>
					</div>
				{/if}

				<!-- Admin: featured toggle -->
				{#if data.user?.isAdmin}
					<div>
						<form
							method="POST"
							action="?/feature"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success' && result.data) {
										localFeatured = result.data.featured as boolean;
									}
									await update({ reset: false });
								};
							}}
						>
							<Button
								type="submit"
								variant={isFeatured ? 'default' : 'outline'}
								class="w-full"
								data-testid="feature-toggle-btn"
							>
								{#if isFeatured}
									<svg
										class="mr-1.5 size-3.5"
										viewBox="0 0 16 16"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
										/>
									</svg>
									Unfeature
								{:else}
									<svg
										class="mr-1.5 size-3.5"
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										aria-hidden="true"
									>
										<path
											d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
										/>
									</svg>
									Feature
								{/if}
							</Button>
						</form>
					</div>
				{/if}

				<!-- Stats -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Stats</h3>
					<div class="space-y-1 text-sm">
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Stars</span>
							<span>{localStarsCount}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Updated</span>
							<span>{timeAgo(displayedUpdatedAt)}</span>
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
									class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
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
				<!-- Report -->
				{#if data.user && data.user.username !== data.setup.ownerUsername}
					<div>
						{#if !showReportForm}
							<button
								onclick={() => (showReportForm = true)}
								class="text-xs text-muted-foreground hover:text-destructive hover:underline"
								data-testid="report-toggle-btn"
							>
								Report this setup
							</button>
						{:else}
							<div class="rounded-lg border border-border bg-card p-3">
								<h3 class="mb-2 text-sm font-semibold">Report Setup</h3>
								<form
									method="POST"
									action="?/report"
									use:enhance={() => {
										reportSubmitting = true;
										return async ({ result, update }) => {
											reportSubmitting = false;
											if (result.type === 'success') {
												showReportForm = false;
											}
											await update();
										};
									}}
								>
									<div class="mb-2">
										<label for="report-reason" class="mb-1 block text-xs font-medium">
											Reason
										</label>
										<select
											id="report-reason"
											name="reason"
											required
											class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
										>
											<option value="">Select a reason...</option>
											<option value="malicious">Malicious</option>
											<option value="spam">Spam</option>
											<option value="inappropriate">Inappropriate</option>
											<option value="other">Other</option>
										</select>
									</div>
									<div class="mb-3">
										<label for="report-description" class="mb-1 block text-xs font-medium">
											Description (optional)
										</label>
										<textarea
											id="report-description"
											name="description"
											rows="3"
											maxlength="1000"
											placeholder="Provide additional context..."
											class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none"
										></textarea>
									</div>
									<div class="flex gap-2">
										<Button
											type="submit"
											variant="destructive"
											size="sm"
											disabled={reportSubmitting}
										>
											Submit Report
										</Button>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onclick={() => (showReportForm = false)}
										>
											Cancel
										</Button>
									</div>
								</form>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Delete setup confirmation dialog -->
	{#if isOwner}
		<DeleteSetupDialog
			open={deleteDialogOpen}
			slug={data.setup.slug}
			setupName={data.setup.name}
			onOpenChange={(v) => (deleteDialogOpen = v)}
		/>
	{/if}

	<!-- BETA: comments hidden, re-enable post-launch -->
	<!-- <Separator class="my-6 lg:my-8" /> -->

	<!-- BETA: mobile comments toggle hidden, re-enable post-launch -->
	<!-- <button
		data-testid="show-comments-btn"
		class="w-full py-2 text-left text-sm font-medium lg:hidden"
		onclick={() => (showComments = !showComments)}
	>
		{showComments
			? 'Hide comments'
			: `Show ${data.comments.length} comment${data.comments.length === 1 ? '' : 's'}`}
	</button> -->

	<!-- BETA: CommentThread hidden, re-enable post-launch -->
	<!-- <div data-testid="comment-thread" class={showComments ? '' : 'hidden lg:block'}>
		<CommentThread
			comments={data.comments}
			isLoggedIn={!!data.user}
			currentUsername={data.user?.username ?? null}
		/>
	</div> -->
</div>
