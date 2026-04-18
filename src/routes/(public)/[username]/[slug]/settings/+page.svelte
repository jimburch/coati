<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';

	const { data, form } = $props();

	let localVisibility = $state<'public' | 'private' | null>(null);
	const currentVisibility = $derived(localVisibility ?? data.setup.visibility);
	let saving = $state(false);

	let shareUsername = $state('');
	let sharing = $state(false);
	let shareError = $state<string | null>(null);
	let overrideShares = $state<typeof data.shares | null>(null);
	const localShares = $derived(overrideShares ?? data.shares);
</script>

<svelte:head>
	<title>Settings — {data.setup.display ?? data.setup.name} - Coati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6">
		<a
			href="/{data.setup.ownerUsername}/{data.setup.slug}"
			class="text-sm text-muted-foreground hover:text-foreground"
		>
			← Back to {data.setup.display ?? data.setup.name}
		</a>
	</div>

	<h1 class="mb-8 text-2xl font-bold">Setup Settings</h1>

	<!-- Visibility section -->
	<div class="rounded-lg border border-border p-6">
		<h2 class="mb-1 text-lg font-semibold">Visibility</h2>
		<p class="mb-4 text-sm text-muted-foreground">Control who can view this setup.</p>

		{#if form?.error}
			<p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		<form
			method="POST"
			action="?/setVisibility"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success' && result.data) {
						localVisibility = result.data.visibility as 'public' | 'private';
						if (result.data.visibility === 'public') {
							overrideShares = [];
						}
					}
					await update({ reset: false });
				};
			}}
		>
			<div class="mb-4 space-y-2">
				<label
					class="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent/30"
				>
					<input
						type="radio"
						name="visibility"
						value="public"
						checked={currentVisibility === 'public'}
						class="mt-0.5"
					/>
					<div>
						<p class="font-medium">Public</p>
						<p class="text-sm text-muted-foreground">Anyone can view and clone this setup.</p>
					</div>
				</label>

				<label
					class="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-accent/30"
				>
					<input
						type="radio"
						name="visibility"
						value="private"
						checked={currentVisibility === 'private'}
						class="mt-0.5"
					/>
					<div>
						<p class="font-medium">Private</p>
						<p class="text-sm text-muted-foreground">
							Only you (and shared users) can view this setup.
						</p>
					</div>
				</label>
			</div>

			<Button type="submit" disabled={saving}>
				{saving ? 'Saving…' : 'Save visibility'}
			</Button>
		</form>
	</div>

	<!-- Sharing section — only shown for private setups -->
	{#if currentVisibility === 'private'}
		<div class="mt-6 rounded-lg border border-border p-6">
			<h2 class="mb-1 text-lg font-semibold">Sharing</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				Share this setup directly with specific users. Shared users can view and clone via direct
				link only — it won't appear in search or explore.
			</p>

			{#if shareError}
				<p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
					{shareError}
				</p>
			{/if}

			<!-- Add user form -->
			<form
				method="POST"
				action="?/shareUser"
				use:enhance={() => {
					sharing = true;
					shareError = null;
					return async ({ result, update }) => {
						sharing = false;
						if (result.type === 'failure' && result.data) {
							shareError = result.data.error as string;
						} else if (result.type === 'success') {
							shareUsername = '';
							await update({ reset: false });
							const fresh = await fetch(`/api/v1/setups/${data.setup.id}/shares`);
							if (fresh.ok) {
								const json = await fresh.json();
								overrideShares = json.data;
							}
							return;
						}
						await update({ reset: false });
					};
				}}
				class="mb-6 flex gap-2"
			>
				<input
					type="text"
					name="username"
					bind:value={shareUsername}
					placeholder="Enter username"
					required
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
				/>
				<Button type="submit" disabled={sharing || !shareUsername.trim()} size="sm">
					{sharing ? 'Adding…' : 'Share'}
				</Button>
			</form>

			<!-- Shared users list -->
			{#if localShares.length > 0}
				<div class="space-y-2">
					{#each localShares as share (share.id)}
						<div class="flex items-center gap-3 rounded-md border border-border p-3">
							<Avatar class="h-8 w-8 flex-shrink-0">
								{#if share.sharedWithAvatarUrl}
									<AvatarImage src={share.sharedWithAvatarUrl} alt={share.sharedWithUsername} />
								{/if}
								<AvatarFallback class="text-xs font-semibold">
									{share.sharedWithUsername[0].toUpperCase()}
								</AvatarFallback>
							</Avatar>

							<a
								href="/{share.sharedWithUsername}"
								class="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary"
							>
								{share.sharedWithUsername}
							</a>

							<form
								method="POST"
								action="?/unshareUser"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											overrideShares = localShares.filter((s) => s.id !== share.id);
											return;
										}
										await update({ reset: false });
									};
								}}
							>
								<input type="hidden" name="userId" value={share.sharedWithUserId} />
								<Button
									type="submit"
									variant="ghost"
									size="sm"
									class="text-destructive hover:text-destructive"
								>
									Remove
								</Button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No users have been given access yet.</p>
			{/if}
		</div>
	{/if}
</div>
