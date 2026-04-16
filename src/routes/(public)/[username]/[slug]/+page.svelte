<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import StarButton from '$lib/components/StarButton.svelte';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import DeleteSetupDialog from '$lib/components/DeleteSetupDialog.svelte';
	import { enhance } from '$app/forms';
	import { timeAgo } from '$lib/utils';
	import SetupFileList from '$lib/components/SetupFileList.svelte';
	import CloneCommand from '$lib/components/CloneCommand.svelte';
	import ReadmeSection from '$lib/components/ReadmeSection.svelte';

	const { data } = $props();

	let showReportForm = $state(false);
	let reportSubmitting = $state(false);

	const isOwner = $derived(!!data.user && data.user.username === data.setup.ownerUsername);
	let localUpdatedAt = $state<Date | null>(null);

	const displayedUpdatedAt = $derived(localUpdatedAt ?? data.setup.updatedAt);

	function handleReadmeSaved(update: { updatedAt: Date | null }) {
		localUpdatedAt = update.updatedAt;
	}

	// About editing state
	let aboutEditMode = $state(false);
	let aboutDisplayInput = $state('');
	let aboutDescriptionInput = $state('');
	let aboutSaving = $state(false);
	let localAboutDisplay = $state<string | null>(null);
	let localAboutDescription = $state<string | null>(null);

	const displayedAboutDisplay = $derived(
		localAboutDisplay !== null ? localAboutDisplay : (data.setup.display ?? data.setup.name)
	);
	const displayedAboutDescription = $derived(
		localAboutDescription !== null ? localAboutDescription : (data.setup.description ?? '')
	);

	function startAboutEdit() {
		aboutDisplayInput = displayedAboutDisplay;
		aboutDescriptionInput = displayedAboutDescription;
		aboutEditMode = true;
	}

	function cancelAboutEdit() {
		aboutEditMode = false;
	}

	// Optimistic featured state for admin toggle
	let localFeatured = $state<boolean | null>(null);
	const isFeatured = $derived(localFeatured !== null ? localFeatured : !!data.setup.featuredAt);

	let deleteDialogOpen = $state(false);
</script>

<svelte:head>
	<title>{data.setup.display ?? data.setup.name} by {data.setup.ownerUsername} - Coati</title>
	<meta name="description" content={data.setup.description} />
</svelte:head>

<OgMeta
	title="{data.setup.display ?? data.setup.name} by {data.setup.ownerUsername} - Coati"
	description={data.setup.description}
	url="/{data.setup.ownerUsername}/{data.setup.slug}"
	type="article"
	twitterCard="summary_large_image"
/>

<div class="mx-auto max-w-6xl px-4 py-6 lg:py-8">
	<!-- Header band (full-width) -->
	<div class="mb-6 border-b border-border pb-6 lg:mb-8 lg:pb-8" data-testid="setup-header">
		<div class="flex items-start justify-between gap-4">
			<!-- Left: display name + description (editable for owners) -->
			<div class="min-w-0 flex-1">
				{#if !aboutEditMode}
					<div class="flex items-center gap-2">
						<h1 class="text-xl font-bold lg:text-2xl">{displayedAboutDisplay}</h1>
						{#if isOwner}
							<button
								onclick={startAboutEdit}
								class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
								aria-label="Edit about section"
								data-testid="edit-about-btn"
							>
								<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
									<path
										d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"
									/>
								</svg>
							</button>
						{/if}
					</div>
					{#if displayedAboutDescription}
						<p class="mt-1 text-sm text-muted-foreground">{displayedAboutDescription}</p>
					{/if}

					<!-- Author + agents + stats row -->
					<div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
						<!-- Author -->
						<a
							href="/{data.setup.ownerUsername}"
							class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
						>
							<Avatar class="size-5">
								<AvatarImage src={data.setup.ownerAvatarUrl} alt={data.setup.ownerUsername} />
								<AvatarFallback>{data.setup.ownerUsername[0].toUpperCase()}</AvatarFallback>
							</Avatar>
							<span class="font-medium">{data.setup.ownerUsername}</span>
						</a>

						<!-- Agent badges -->
						{#each data.agents as agent (agent.id)}
							<a
								href="/agents/{agent.slug}"
								class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
							>
								<AgentIcon slug={agent.slug} size={12} />
								{agent.displayName}
							</a>
						{/each}

						<span class="text-xs text-muted-foreground">·</span>
						<span class="text-xs text-muted-foreground">
							updated {timeAgo(displayedUpdatedAt)}
						</span>
					</div>
				{:else}
					<!-- About edit form -->
					<form
						method="POST"
						action="?/saveAbout"
						data-testid="about-editor"
						use:enhance={() => {
							aboutSaving = true;
							return async ({ result, update }) => {
								aboutSaving = false;
								if (result.type === 'success' && result.data) {
									localAboutDisplay = (result.data.display as string | null) ?? null;
									localAboutDescription = (result.data.description as string | null) ?? null;
									aboutEditMode = false;
								}
								await update({ reset: false });
							};
						}}
					>
						<div class="space-y-2">
							<div>
								<label for="about-display" class="mb-1 block text-xs font-medium"
									>Display name</label
								>
								<input
									id="about-display"
									name="display"
									type="text"
									maxlength="150"
									required
									bind:value={aboutDisplayInput}
									class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									data-testid="about-display-input"
								/>
							</div>
							<div>
								<label for="about-description" class="mb-1 block text-xs font-medium"
									>Description</label
								>
								<textarea
									id="about-description"
									name="description"
									maxlength="300"
									rows={3}
									bind:value={aboutDescriptionInput}
									class="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									data-testid="about-description-textarea"
								></textarea>
							</div>
							<div class="flex gap-2">
								<Button type="submit" size="sm" disabled={aboutSaving} data-testid="save-about-btn">
									{aboutSaving ? 'Saving…' : 'Save'}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={cancelAboutEdit}
									data-testid="cancel-about-btn"
								>
									Cancel
								</Button>
							</div>
						</div>
					</form>
				{/if}
			</div>

			<!-- Right: Star button -->
			<div class="shrink-0">
				<StarButton isStarred={data.isStarred} starsCount={data.setup.starsCount} />
			</div>
		</div>
	</div>

	<!-- Three-zone body: main column + slim sidebar -->
	<div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
		<!-- Main column -->
		<div class="min-w-0 flex-1">
			<!-- Clone command: mobile only (appears between header and files) -->
			<div class="mb-6 lg:hidden">
				<CloneCommand username={data.setup.ownerUsername} slug={data.setup.slug} />
			</div>

			<!-- Files section -->
			<SetupFileList
				files={data.files}
				agents={data.agents}
				username={data.setup.ownerUsername}
				slug={data.setup.slug}
			/>

			<!-- README section -->
			<ReadmeSection
				readmeHtml={data.readmeHtml}
				readmeRaw={data.setup.readme ?? null}
				{isOwner}
				onSaved={handleReadmeSaved}
			/>
		</div>

		<!-- Slim sticky sidebar (~200px, desktop only) -->
		<aside class="w-full shrink-0 lg:w-64" data-testid="sidebar">
			<div class="lg:sticky lg:top-16 space-y-6">
				<!-- Clone command (desktop only — mobile version is above) -->
				<div class="hidden lg:block">
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Clone</h3>
					<CloneCommand username={data.setup.ownerUsername} slug={data.setup.slug} />
				</div>

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

				<!-- Report (non-owner logged-in users) -->
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
											class="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm"
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
		</aside>
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
