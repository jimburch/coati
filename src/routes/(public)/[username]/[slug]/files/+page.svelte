<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import FileTree from '$lib/components/FileTree.svelte';
	import FileViewer from '$lib/components/FileViewer.svelte';

	const { data } = $props();

	let mobileTreeOpen = $state(false);

	const basePath = $derived(`/${data.setup.ownerUsername}/${data.setup.slug}/files`);
</script>

<svelte:head>
	<title>Files - {data.setup.name} - Coati</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-8">
	<!-- Breadcrumb -->
	<nav class="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground lg:mb-6">
		<a href="/{data.setup.ownerUsername}" class="hover:text-foreground hover:underline">
			{data.setup.ownerUsername}
		</a>
		<ChevronRight class="size-3.5" />
		<a
			href="/{data.setup.ownerUsername}/{data.setup.slug}"
			class="hover:text-foreground hover:underline"
		>
			{data.setup.slug}
		</a>
		<ChevronRight class="size-3.5" />
		<span class="text-foreground">Files</span>
	</nav>

	<!-- Mobile toggle -->
	<div class="mb-4 md:hidden">
		<Button variant="outline" class="w-full" onclick={() => (mobileTreeOpen = !mobileTreeOpen)}>
			{mobileTreeOpen ? 'Hide files' : `Show files (${data.files.length})`}
		</Button>
		{#if mobileTreeOpen}
			<div class="mt-2 rounded-lg border border-border p-2">
				<FileTree files={data.files} selectedPath={data.selectedFile.source} {basePath} />
			</div>
		{/if}
	</div>

	<!-- Desktop two-column / Mobile single-column -->
	<div class="flex gap-4 lg:gap-6">
		<!-- Sidebar (desktop only) -->
		<aside class="hidden w-64 shrink-0 md:block">
			<div class="sticky top-8 rounded-lg border border-border p-2">
				<FileTree files={data.files} selectedPath={data.selectedFile.source} {basePath} />
			</div>
		</aside>

		<!-- Main content -->
		<div class="min-w-0 flex-1">
			<FileViewer file={data.selectedFile} highlightedHtml={data.highlightedHtml} />
		</div>
	</div>
</div>
