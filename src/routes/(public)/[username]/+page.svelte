<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Dialog, DialogContent, DialogTitle } from '$lib/components/ui/dialog';
	import SetupCard from '$lib/components/SetupCard.svelte';
	import FollowButton from '$lib/components/FollowButton.svelte';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import type { FeedItem } from '$lib/server/queries/activities';

	const { data } = $props();

	const joinedDate = $derived(
		new Date(data.profile.createdAt).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		})
	);

	// eslint-disable-next-line svelte/prefer-writable-derived -- needs mutable state for optimistic follow count updates
	let followersCount = $state(untrack(() => data.profile.followersCount));
	$effect(() => {
		followersCount = data.profile.followersCount;
	});

	const isOwnProfile = $derived(data.currentUserId === data.profile.id);
	const showFollowButton = $derived(data.currentUserId !== null && !isOwnProfile);

	let editProfileOpen = $state(false);
	let savingProfile = $state(false);

	// Hydrate dates (server sends strings over the wire)
	const activityItems = $derived(
		(data.activityItems as FeedItem[]).map((item) => ({
			...item,
			createdAt: new Date(item.createdAt)
		}))
	);

	function tabHref(tab: string) {
		return `/${data.profile.username}?tab=${tab}`;
	}
</script>

<svelte:head>
	<title>{data.profile.username} - Coati</title>
	<meta
		name="description"
		content={data.profile.bio ?? `${data.profile.username}'s AI coding setups on Coati`}
	/>
</svelte:head>

<OgMeta
	title="{data.profile.name ?? data.profile.username} - Coati"
	description={data.profile.bio ?? `${data.profile.username}'s AI coding setups on Coati`}
	url="/{data.profile.username}"
	image={data.profile.avatarUrl}
	type="profile"
	twitterCard="summary_large_image"
/>

<div class="mx-auto max-w-4xl px-4 py-6 lg:py-8">
	<!-- Header -->
	<div class="flex gap-4 lg:gap-6">
		<Avatar class="size-16 text-xl lg:size-24 lg:text-2xl">
			<AvatarImage src={data.profile.avatarUrl} alt={data.profile.username} />
			<AvatarFallback>{data.profile.username[0].toUpperCase()}</AvatarFallback>
		</Avatar>

		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-start gap-3">
				<div class="min-w-0 flex-1">
					{#if data.profile.name}
						<h1 class="text-xl font-bold lg:text-2xl" data-testid="profile-name">
							{data.profile.name}
						</h1>
						<p class="text-sm text-muted-foreground" data-testid="profile-username">
							@{data.profile.username}
						</p>
					{:else}
						<h1 class="text-xl font-bold lg:text-2xl" data-testid="profile-username">
							@{data.profile.username}
						</h1>
					{/if}
				</div>
				<div class="flex items-center gap-2">
					{#if showFollowButton}
						<FollowButton
							isFollowing={data.isFollowing}
							{followersCount}
							onoptimisticchange={(following) => {
								followersCount = following ? followersCount + 1 : followersCount - 1;
							}}
						/>
					{/if}
					{#if isOwnProfile}
						<Button
							variant="outline"
							size="sm"
							onclick={() => (editProfileOpen = true)}
							data-testid="edit-profile-button"
						>
							Edit profile
						</Button>
					{/if}
				</div>
			</div>

			{#if data.profile.bio}
				<p class="mt-1 text-sm text-muted-foreground lg:text-base">{data.profile.bio}</p>
			{/if}

			{#if data.profile.location}
				<div
					class="mt-2 flex items-center gap-1 text-sm text-muted-foreground"
					data-testid="profile-location"
				>
					<svg class="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
						<path
							d="M8 0a5.53 5.53 0 0 0-5.5 5.5c0 4.069 5.5 10.5 5.5 10.5S13.5 9.569 13.5 5.5A5.53 5.53 0 0 0 8 0zm0 7.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"
						/>
					</svg>
					{data.profile.location}
				</div>
			{/if}

			<div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
				{#if data.profile.websiteUrl}
					<a
						href={data.profile.websiteUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 hover:text-foreground"
					>
						<svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
							<path
								d="M4.75 3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25v-5.5h-2.25A1.75 1.75 0 0 1 7.5 5V2.75H4.75zM9 2.32v2.18c0 .138.112.25.25.25h2.18L9 2.32zM3 3.75C3 2.784 3.784 2 4.75 2h3.5a.75.75 0 0 1 .53.22l3.5 3.5a.75.75 0 0 1 .22.53v6A1.75 1.75 0 0 1 10.75 14h-6A1.75 1.75 0 0 1 3 12.25v-8.5z"
							/>
						</svg>
						{(() => {
							try {
								return new URL(data.profile.websiteUrl).hostname;
							} catch {
								return data.profile.websiteUrl;
							}
						})()}
					</a>
				{/if}

				<a
					href="https://github.com/{data.profile.githubUsername}"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 hover:text-foreground"
				>
					<svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
						/>
					</svg>
					{data.profile.githubUsername}
				</a>
			</div>
		</div>
	</div>

	<!-- Stats -->
	<div class="mt-3 text-sm text-muted-foreground lg:mt-4">
		<span>{data.profile.setupsCount} setups</span>
		<span class="mx-1">&middot;</span>
		<span>{followersCount} followers</span>
		<span class="mx-1">&middot;</span>
		<span>{data.profile.followingCount} following</span>
	</div>

	<p class="mt-1 text-xs text-muted-foreground">Joined {joinedDate}</p>

	<Separator class="my-4 lg:my-6" />

	<!-- Tabs -->
	<div class="mb-4 lg:mb-6" data-testid="profile-tabs">
		<nav class="-mb-px flex gap-0 border-b border-border" aria-label="Profile tabs">
			<a
				href={tabHref('setups')}
				data-testid="tab-setups"
				class="border-b-2 px-3 py-2 text-sm font-medium transition-colors lg:px-4 {data.tab ===
				'setups'
					? 'border-foreground text-foreground'
					: 'border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground'}"
				aria-current={data.tab === 'setups' ? 'page' : undefined}
			>
				Setups
			</a>
			<a
				href={tabHref('starred')}
				data-testid="tab-starred"
				class="border-b-2 px-3 py-2 text-sm font-medium transition-colors lg:px-4 {data.tab ===
				'starred'
					? 'border-foreground text-foreground'
					: 'border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground'}"
				aria-current={data.tab === 'starred' ? 'page' : undefined}
			>
				Starred
			</a>
			<a
				href={tabHref('activity')}
				data-testid="tab-activity"
				class="border-b-2 px-3 py-2 text-sm font-medium transition-colors lg:px-4 {data.tab ===
				'activity'
					? 'border-foreground text-foreground'
					: 'border-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground'}"
				aria-current={data.tab === 'activity' ? 'page' : undefined}
			>
				Activity
			</a>
		</nav>
	</div>

	<!-- Edit Profile Dialog -->
	{#if isOwnProfile}
		<Dialog open={editProfileOpen} onOpenChange={(v) => (editProfileOpen = v)}>
			<DialogContent data-testid="edit-profile-modal">
				<DialogTitle>Edit profile</DialogTitle>
				<form
					method="POST"
					action="?/updateProfile"
					use:enhance={() => {
						savingProfile = true;
						return async ({ result, update }) => {
							savingProfile = false;
							if (result.type === 'success') {
								editProfileOpen = false;
							}
							await update();
						};
					}}
					class="mt-4 space-y-4"
					data-testid="edit-profile-form"
				>
					<div class="space-y-1.5">
						<Label for="edit-name">Name</Label>
						<Input
							id="edit-name"
							name="name"
							type="text"
							placeholder="Your display name"
							value={data.profile.name ?? ''}
							maxlength={100}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="edit-bio">Bio</Label>
						<Textarea
							id="edit-bio"
							name="bio"
							placeholder="Tell others a bit about yourself"
							rows={3}
							maxlength={500}>{data.profile.bio ?? ''}</Textarea
						>
					</div>
					<div class="space-y-1.5">
						<Label for="edit-website">Website</Label>
						<Input
							id="edit-website"
							name="websiteUrl"
							type="url"
							placeholder="https://example.com"
							value={data.profile.websiteUrl ?? ''}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="edit-location">Location</Label>
						<Input
							id="edit-location"
							name="location"
							type="text"
							placeholder="City, Country"
							value={data.profile.location ?? ''}
							maxlength={100}
						/>
					</div>
					<div class="flex justify-end gap-2 pt-2">
						<Button
							type="button"
							variant="outline"
							onclick={() => (editProfileOpen = false)}
							disabled={savingProfile}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={savingProfile}>
							{savingProfile ? 'Saving...' : 'Save'}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	{/if}

	<!-- Tab content -->
	{#if data.tab === 'setups'}
		<section data-testid="tab-panel-setups">
			{#if data.setups.length > 0}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each data.setups as setup (setup.id)}
						<SetupCard {setup} username={data.profile.username} />
					{/each}
				</div>
			{:else}
				<div class="py-12 text-center" data-testid="setups-empty">
					<p class="text-muted-foreground">No setups yet.</p>
				</div>
			{/if}
		</section>
	{:else if data.tab === 'starred'}
		<section data-testid="tab-panel-starred">
			{#if data.starredSetups.length > 0}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					{#each data.starredSetups as setup (setup.id)}
						<SetupCard {setup} username={setup.ownerUsername} showAuthor={true} />
					{/each}
				</div>
			{:else}
				<div class="py-12 text-center" data-testid="starred-empty">
					<p class="text-muted-foreground">No starred setups yet.</p>
				</div>
			{/if}
		</section>
	{:else}
		<section data-testid="tab-panel-activity">
			<ActivityFeed
				items={activityItems}
				emptyMessage="No activity yet."
				paginationEndpoint="/api/v1/users/{data.profile.username}/activity"
			/>
		</section>
	{/if}
</div>
