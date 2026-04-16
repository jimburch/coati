<script lang="ts">
	import StarButton from '$lib/components/StarButton.svelte';
	import OgMeta from '$lib/components/OgMeta.svelte';
	import SetupFileList from '$lib/components/SetupFileList.svelte';
	import CloneCommand from '$lib/components/CloneCommand.svelte';
	import ReadmeSection from '$lib/components/ReadmeSection.svelte';
	import SetupHeader from '$lib/components/SetupHeader.svelte';
	import SetupSidebar from '$lib/components/SetupSidebar.svelte';

	const { data } = $props();

	const isOwner = $derived(!!data.user && data.user.username === data.setup.ownerUsername);
	let readmeUpdatedAt = $state<Date | null>(null);

	const displayedUpdatedAt = $derived(readmeUpdatedAt ?? data.setup.updatedAt);
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
	<SetupHeader setup={data.setup} agents={data.agents} {isOwner} updatedAt={displayedUpdatedAt}>
		{#if data.setup.visibility !== 'private'}
			<StarButton isStarred={data.isStarred} starsCount={data.setup.starsCount} />
		{/if}
	</SetupHeader>

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
				onSaved={(update) => (readmeUpdatedAt = update.updatedAt)}
			/>
		</div>

		<!-- Slim sticky sidebar (~200px, desktop only) -->
		<SetupSidebar
			setup={data.setup}
			tags={data.tags}
			{isOwner}
			isAdmin={!!data.user?.isAdmin}
			isLoggedIn={!!data.user}
			ownerUsername={data.setup.ownerUsername}
		/>
	</div>

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
