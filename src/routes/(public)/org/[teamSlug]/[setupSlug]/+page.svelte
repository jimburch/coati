<script lang="ts">
	import { page } from '$app/state';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import SetupFileList from '$lib/components/SetupFileList.svelte';
	import CloneCommand from '$lib/components/CloneCommand.svelte';
	import BadgeEmbed from '$lib/components/BadgeEmbed.svelte';
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
	const badgeUrl = $derived(`${page.url.origin}/org/${team.slug}/${setup.slug}/badge.svg`);
	const setupUrl = $derived(`${page.url.origin}/org/${team.slug}/${setup.slug}`);
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
					{#if data.viewerRole === 'admin'}
						<a
							href="/org/{team.slug}/{setup.slug}/settings"
							class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
							aria-label="Setup settings"
							data-testid="settings-link"
						>
							<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
								<path
									d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294.016.257.016.515 0 .772-.01.147.038.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.977 7.977 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.102-.302c-.067-.019-.177-.011-.3.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.211.224l-.29 1.106c-.168.646-.715 1.196-1.458 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.064-1.289-.614-1.458-1.26l-.289-1.106c-.018-.066-.079-.158-.212-.224a5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.05-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.038-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.102.302c.067.019.177.011.3-.071.214-.143.437-.272.668-.386.133-.066.194-.158.211-.224l.29-1.106C6.717.645 7.264.095 8.007.031 8.23.01 8.617 0 8 0Zm0 5a3 3 0 1 0 0 6A3 3 0 0 0 8 5Zm0 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
								/>
							</svg>
						</a>
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
					<div class="mt-2">
						<BadgeEmbed {badgeUrl} {setupUrl} />
					</div>
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
