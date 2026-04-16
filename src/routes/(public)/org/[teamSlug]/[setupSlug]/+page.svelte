<script lang="ts">
	import OgMeta from '$lib/components/OgMeta.svelte';
	import SetupFileList from '$lib/components/SetupFileList.svelte';
	import CloneCommand from '$lib/components/CloneCommand.svelte';
	import ReadmeSection from '$lib/components/ReadmeSection.svelte';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import { timeAgo } from '$lib/utils';

	const { data } = $props();

	const setup = $derived(data.setup);
	const team = $derived({
		name: setup.teamName,
		slug: setup.teamSlug,
		avatarUrl: setup.teamAvatarUrl
	});

	const filesBasePath = $derived(`/org/${team.slug}/${setup.slug}/files`);
</script>

<svelte:head>
	<title>{setup.display ?? setup.name} by {team.name} - Coati</title>
	<meta name="description" content={setup.description} />
</svelte:head>

<OgMeta
	title="{setup.display ?? setup.name} by {team.name} - Coati"
	description={setup.description}
	url="/org/{team.slug}/{setup.slug}"
	type="article"
	twitterCard="summary_large_image"
/>

<div class="mx-auto max-w-6xl px-4 py-6 lg:py-8">
	<!-- Header band -->
	<div class="mb-6 border-b border-border pb-6 lg:mb-8 lg:pb-8" data-testid="setup-header">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-bold lg:text-2xl">{setup.display ?? setup.name}</h1>
					{#if setup.visibility === 'private'}
						<span
							class="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
							data-testid="private-badge"
						>
							Private
						</span>
					{/if}
				</div>
				{#if setup.description}
					<p class="mt-1 text-sm text-muted-foreground">{setup.description}</p>
				{/if}

				<!-- Team author + agents row -->
				<div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
					<a
						href="/org/{team.slug}"
						class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
						data-testid="team-author"
					>
						<Avatar class="size-5">
							{#if team.avatarUrl}
								<AvatarImage src={team.avatarUrl} alt={team.name ?? ''} />
							{/if}
							<AvatarFallback>{(team.name ?? 'T')[0].toUpperCase()}</AvatarFallback>
						</Avatar>
						<span class="font-medium">{team.name}</span>
					</a>

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
						updated {timeAgo(setup.updatedAt)}
					</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Three-zone body -->
	<div class="flex flex-col gap-6 lg:flex-row lg:gap-8">
		<!-- Main column -->
		<div class="min-w-0 flex-1">
			<!-- Clone command: mobile only -->
			<div class="mb-6 lg:hidden">
				<CloneCommand username={setup.ownerUsername} slug={setup.slug} />
			</div>

			<SetupFileList
				files={data.files}
				agents={data.agents}
				username={setup.ownerUsername}
				slug={setup.slug}
				basePath={filesBasePath}
			/>

			<ReadmeSection
				readmeHtml={data.readmeHtml}
				readmeRaw={setup.readme ?? null}
				isOwner={false}
				onSaved={() => {}}
			/>
		</div>

		<!-- Slim sticky sidebar -->
		<aside class="w-full shrink-0 lg:w-64" data-testid="sidebar">
			<div class="space-y-6 lg:sticky lg:top-16">
				<!-- Clone command (desktop only) -->
				<div class="hidden lg:block">
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Clone</h3>
					<CloneCommand username={setup.ownerUsername} slug={setup.slug} />
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

				<!-- Team info -->
				<div>
					<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Team</h3>
					<a
						href="/org/{team.slug}"
						class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
					>
						<Avatar class="size-6">
							{#if team.avatarUrl}
								<AvatarImage src={team.avatarUrl} alt={team.name ?? ''} />
							{/if}
							<AvatarFallback>{(team.name ?? 'T')[0].toUpperCase()}</AvatarFallback>
						</Avatar>
						{team.name}
					</a>
				</div>
			</div>
		</aside>
	</div>
</div>
