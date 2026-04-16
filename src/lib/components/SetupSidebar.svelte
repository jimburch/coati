<script lang="ts">
	import { enhance } from '$app/forms';
	import CloneCommand from '$lib/components/CloneCommand.svelte';
	import DeleteSetupDialog from '$lib/components/DeleteSetupDialog.svelte';
	import { Button } from '$lib/components/ui/button';

	interface SetupProp {
		slug: string;
		name: string;
		featuredAt: Date | string | null;
	}

	interface TagProp {
		id: string | number;
		name: string;
	}

	interface Props {
		setup: SetupProp;
		tags: TagProp[];
		isOwner: boolean;
		isAdmin: boolean;
		isLoggedIn: boolean;
		ownerUsername: string;
	}

	const { setup, tags, isOwner, isAdmin, isLoggedIn, ownerUsername }: Props = $props();

	let localFeatured = $state<boolean | null>(null);
	let showReportForm = $state(false);
	let reportSubmitting = $state(false);
	let deleteDialogOpen = $state(false);

	const isFeatured = $derived(localFeatured !== null ? localFeatured : !!setup.featuredAt);
	const showReport = $derived(isLoggedIn && !isOwner);
</script>

<aside class="w-full shrink-0 lg:w-64" data-testid="sidebar">
	<div class="space-y-6 lg:sticky lg:top-16">
		<!-- Clone command (desktop only — mobile version lives above in main column) -->
		<div class="hidden lg:block">
			<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Clone</h3>
			<CloneCommand username={ownerUsername} slug={setup.slug} />
		</div>

		<!-- Tags -->
		{#if tags.length > 0}
			<div>
				<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Tags</h3>
				<div class="flex flex-wrap gap-1.5">
					{#each tags as tag (tag.id)}
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
		{#if isAdmin}
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

		<!-- Report (non-owner logged-in users only) -->
		{#if showReport}
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
								<label for="report-reason" class="mb-1 block text-xs font-medium">Reason</label>
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
								<Button type="submit" variant="destructive" size="sm" disabled={reportSubmitting}>
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

<!-- Delete setup confirmation dialog (rendered here so deleteDialogOpen state is local) -->
{#if isOwner}
	<DeleteSetupDialog
		open={deleteDialogOpen}
		slug={setup.slug}
		setupName={setup.name}
		onOpenChange={(v) => (deleteDialogOpen = v)}
	/>
{/if}
