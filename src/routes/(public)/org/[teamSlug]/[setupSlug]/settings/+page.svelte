<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';

	const { data, form } = $props();

	let localVisibility = $state<'public' | 'private' | null>(null);
	const currentVisibility = $derived(localVisibility ?? data.setup.visibility);
	let saving = $state(false);
</script>

<svelte:head>
	<title>Settings — {data.setup.display ?? data.setup.name} - Coati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6">
		<a
			href="/org/{data.teamSlug}/{data.setup.slug}"
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

		{#if !data.isAdmin}
			<p class="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
				Only team owners and admins can change setup visibility.
			</p>
		{:else}
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
							<p class="text-sm text-muted-foreground">Only team members can view this setup.</p>
						</div>
					</label>
				</div>

				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : 'Save visibility'}
				</Button>
			</form>
		{/if}
	</div>
</div>
