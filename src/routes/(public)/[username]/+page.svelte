<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Separator } from '$lib/components/ui/separator';
	import SetupCard from '$lib/components/SetupCard.svelte';

	const { data } = $props();

	const joinedDate = $derived(
		new Date(data.profile.createdAt).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		})
	);
</script>

<svelte:head>
	<title>{data.profile.username} - Magpie</title>
	<meta
		name="description"
		content={data.profile.bio ?? `${data.profile.username}'s AI coding setups on Magpie`}
	/>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8">
	<!-- Header -->
	<div class="flex gap-6">
		<Avatar class="size-24 text-2xl">
			<AvatarImage src={data.profile.avatarUrl} alt={data.profile.username} />
			<AvatarFallback>{data.profile.username[0].toUpperCase()}</AvatarFallback>
		</Avatar>

		<div class="min-w-0 flex-1">
			<h1 class="text-2xl font-bold">{data.profile.username}</h1>

			{#if data.profile.bio}
				<p class="mt-1 text-muted-foreground">{data.profile.bio}</p>
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
	<div class="mt-4 text-sm text-muted-foreground">
		<span>{data.profile.setupsCount} setups</span>
		<span class="mx-1">&middot;</span>
		<span>{data.profile.followersCount} followers</span>
		<span class="mx-1">&middot;</span>
		<span>{data.profile.followingCount} following</span>
	</div>

	<p class="mt-1 text-xs text-muted-foreground">Joined {joinedDate}</p>

	<Separator class="my-6" />

	<!-- Setups -->
	<section>
		<h2 class="mb-4 text-lg font-semibold">Setups</h2>

		{#if data.setups.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				{#each data.setups as setup (setup.id)}
					<SetupCard {setup} username={data.profile.username} />
				{/each}
			</div>
		{:else}
			<p class="text-muted-foreground">No setups yet.</p>
		{/if}
	</section>
</div>
