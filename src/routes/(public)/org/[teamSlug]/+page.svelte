<script lang="ts">
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import SetupCard from '$lib/components/SetupCard.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const team = $derived(data.team);
</script>

<svelte:head>
	<title>{team.name} - Coati</title>
	<meta name="description" content={team.description ?? `${team.name} on Coati`} />
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-10">
	<!-- Team header -->
	<div class="mb-8 flex items-start gap-4 lg:mb-10 lg:gap-6">
		<Avatar class="h-16 w-16 lg:h-20 lg:w-20 flex-shrink-0">
			{#if team.avatarUrl}
				<AvatarImage src={team.avatarUrl} alt={team.name} />
			{/if}
			<AvatarFallback class="text-xl lg:text-2xl font-semibold">
				{team.name[0].toUpperCase()}
			</AvatarFallback>
		</Avatar>

		<div class="min-w-0">
			<h1 class="text-xl font-bold text-foreground lg:text-3xl">{team.name}</h1>
			<p class="mt-0.5 text-sm text-muted-foreground font-mono">@{team.slug}</p>
			{#if team.description}
				<p class="mt-2 text-sm text-muted-foreground lg:text-base">{team.description}</p>
			{/if}
			<p class="mt-2 text-xs text-muted-foreground">
				{team.membersCount}
				{team.membersCount === 1 ? 'member' : 'members'}
			</p>
		</div>
	</div>

	<!-- Setups grid -->
	{#if team.setups.length > 0}
		<div>
			<h2 class="mb-4 text-base font-semibold text-foreground lg:text-lg">
				Public Setups
				<span class="ml-1.5 text-sm font-normal text-muted-foreground">({team.setups.length})</span>
			</h2>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-4">
				{#each team.setups as setup (setup.id)}
					<SetupCard
						setup={{
							...setup,
							teamSlug: team.slug,
							teamName: team.name,
							teamAvatarUrl: team.avatarUrl
						}}
						username={setup.ownerUsername}
						showAuthor
					/>
				{/each}
			</div>
		</div>
	{:else}
		<div class="py-12 text-center">
			<p class="text-muted-foreground">This team has no public setups yet.</p>
		</div>
	{/if}
</div>
