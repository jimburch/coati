<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	const user = $derived(data.profileUser);

	let saving = $state(false);
	let showSuccess = $state(false);
	let successTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (form?.success) {
			showSuccess = true;
			if (successTimer) clearTimeout(successTimer);
			successTimer = setTimeout(() => {
				showSuccess = false;
			}, 3000);
		}
	});
</script>

<div class="mx-auto max-w-2xl px-4 py-6 lg:py-10">
	<h1 class="text-foreground mb-6 text-xl font-bold lg:mb-8 lg:text-2xl">Settings</h1>

	<!-- Profile Section -->
	<section class="mb-6 lg:mb-10" data-testid="profile-section">
		<h2 class="text-foreground mb-1 text-base font-semibold lg:text-lg">Profile</h2>
		<p class="text-muted-foreground mb-4 text-sm lg:mb-6">
			Update your public profile information. All fields are optional.
		</p>

		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					saving = false;
					await update();
				};
			}}
			class="space-y-4 lg:space-y-5"
			data-testid="profile-form"
		>
			<div class="space-y-1.5">
				<Label for="name">Name</Label>
				<Input
					id="name"
					name="name"
					type="text"
					placeholder="Your display name"
					value={form?.fields?.name ?? user?.name ?? ''}
					maxlength={100}
					data-testid="input-name"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="bio">Bio</Label>
				<Textarea
					id="bio"
					name="bio"
					placeholder="Tell others a bit about yourself"
					rows={3}
					maxlength={500}
					data-testid="input-bio">{form?.fields?.bio ?? user?.bio ?? ''}</Textarea
				>
			</div>

			<div class="space-y-1.5">
				<Label for="websiteUrl">Website</Label>
				<Input
					id="websiteUrl"
					name="websiteUrl"
					type="url"
					placeholder="https://yoursite.com"
					value={form?.fields?.websiteUrl ?? user?.websiteUrl ?? ''}
					data-testid="input-website"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="location">Location</Label>
				<Input
					id="location"
					name="location"
					type="text"
					placeholder="City, Country"
					value={form?.fields?.location ?? user?.location ?? ''}
					maxlength={100}
					data-testid="input-location"
				/>
			</div>

			{#if form?.error}
				<p class="text-destructive text-sm" data-testid="form-error" role="alert">
					{form.error}
				</p>
			{/if}

			{#if showSuccess}
				<p
					class="text-sm text-green-600 dark:text-green-400"
					data-testid="success-message"
					role="status"
				>
					Profile saved successfully.
				</p>
			{/if}

			<Button type="submit" disabled={saving} data-testid="save-button">
				{saving ? 'Saving...' : 'Save profile'}
			</Button>
		</form>
	</section>

	<hr class="border-border mb-6 lg:mb-10" />

	<!-- Account Section -->
	<section data-testid="account-section">
		<h2 class="text-foreground mb-1 text-base font-semibold lg:text-lg">Account</h2>
		<p class="text-muted-foreground mb-4 text-sm lg:mb-6">
			Your account details, managed via GitHub.
		</p>

		<div class="space-y-4 lg:space-y-6">
			<!-- Avatar -->
			<div class="flex items-center gap-3 lg:gap-4" data-testid="account-avatar">
				{#if user?.avatarUrl}
					<img
						src={user.avatarUrl}
						alt="{user.username}'s avatar"
						class="h-12 w-12 rounded-full lg:h-16 lg:w-16"
					/>
				{/if}
				<div>
					<p class="text-foreground text-sm font-medium">Avatar</p>
					<p class="text-muted-foreground text-xs">Managed via GitHub</p>
				</div>
			</div>

			<!-- Email -->
			<div data-testid="account-email">
				<p class="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">Email</p>
				<p class="text-foreground text-sm">{user?.email ?? '—'}</p>
			</div>

			<!-- GitHub username -->
			<div data-testid="account-github">
				<p class="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
					GitHub username
				</p>
				{#if user?.githubUsername}
					<a
						href="https://github.com/{user.githubUsername}"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary hover:underline text-sm"
					>
						@{user.githubUsername}
					</a>
				{:else}
					<p class="text-foreground text-sm">—</p>
				{/if}
			</div>

			<!-- Joined date -->
			<div data-testid="account-joined">
				<p class="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
					Member since
				</p>
				<p class="text-foreground text-sm">
					{#if user?.createdAt}
						{new Date(user.createdAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					{:else}
						—
					{/if}
				</p>
			</div>
		</div>
	</section>
</div>
