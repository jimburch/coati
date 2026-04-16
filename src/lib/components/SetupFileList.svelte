<script lang="ts">
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { SetupFile } from '$lib/types';
	import {
		groupFilesByAgent,
		shouldStartExpanded,
		allFilesAgentless,
		getFilename,
		type AgentLike,
		type FileNode
	} from './SetupFileList.utils.js';

	interface Props {
		files: SetupFile[];
		agents: AgentLike[];
		username: string;
		slug: string;
	}

	const { files, agents, username, slug }: Props = $props();

	const groups = $derived(groupFilesByAgent(files, agents));
	const startExpanded = $derived(shouldStartExpanded(files.length));
	const agentless = $derived(allFilesAgentless(files));

	// Per-group/folder expand state.  Keys:
	//   agent group  → agentSlug | "__shared"
	//   sub-folder   → "{groupKey}:{folder}"
	const expandedState = new SvelteMap<string, boolean>();

	function isExpanded(key: string): boolean {
		const stored = expandedState.get(key);
		return stored !== undefined ? stored : startExpanded;
	}

	function toggle(key: string): void {
		expandedState.set(key, !isExpanded(key));
	}

	function fileHref(path: string): string {
		return `/${username}/${slug}/files?file=${encodeURIComponent(path)}`;
	}

	function nodeKey(node: FileNode): string {
		if (node.kind === 'root-file' || node.kind === 'single-file-folder') {
			return node.file.id;
		}
		return `folder:${node.folder}`;
	}

	function getExtension(path: string): string {
		const name = path.split('/').pop() ?? '';
		const dot = name.lastIndexOf('.');
		return dot > 0 ? name.slice(dot).toLowerCase() : '';
	}
</script>

{#if files.length > 0}
	<div class="mb-6" data-testid="setup-file-list">
		<div class="mb-2 flex items-center justify-end">
			<a href="/{username}/{slug}/files" class="text-xs text-muted-foreground hover:underline">
				Browse all {files.length}
				{files.length === 1 ? 'file' : 'files'} →
			</a>
		</div>

		<div class="space-y-1 rounded-md border border-border p-3">
			{#if agentless}
				<!-- No group header when every file is agent-less -->
				{#each groups[0].nodes as node (nodeKey(node))}
					{@render fileNode(node, null)}
				{/each}
			{:else}
				{#each groups as group (group.agentSlug ?? '__shared')}
					{@const groupKey = group.agentSlug ?? '__shared'}
					{@const expanded = isExpanded(groupKey)}

					<div>
						<!-- Agent group header -->
						<button
							class="flex w-full items-center gap-1.5 rounded bg-muted/50 px-2 py-1 text-sm hover:bg-accent"
							onclick={() => toggle(groupKey)}
							aria-expanded={expanded}
							data-testid="agent-group-header"
						>
							<!-- Chevron -->
							<svg
								class="size-3 shrink-0 text-muted-foreground transition-transform duration-200 {expanded
									? 'rotate-0'
									: '-rotate-90'}"
								viewBox="0 0 16 16"
								fill="currentColor"
								aria-hidden="true"
								data-testid="collapse-toggle"
							>
								<path
									d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"
								/>
							</svg>

							<!-- Icon: agent icon or folder icon for Shared -->
							{#if group.agentSlug}
								<AgentIcon slug={group.agentSlug} size={14} />
							{:else}
								<svg
									class="size-3.5 shrink-0 text-muted-foreground"
									viewBox="0 0 16 16"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"
									/>
								</svg>
							{/if}

							<span class="font-medium">{group.displayName}</span>
							<span class="ml-auto text-xs text-muted-foreground">
								{group.totalFiles}
								{group.totalFiles === 1 ? 'file' : 'files'}
							</span>
						</button>

						<!-- Collapsible body: grid-template-rows animation -->
						<div
							class="grid"
							style="grid-template-rows: {expanded
								? '1fr'
								: '0fr'}; transition: grid-template-rows 200ms ease;"
						>
							<div class="overflow-hidden">
								<div class="space-y-1 pl-[22px] pt-0.5">
									{#each group.nodes as node (nodeKey(node))}
										{@render fileNode(node, groupKey)}
									{/each}
								</div>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

{#snippet fileNode(node: FileNode, groupKey: string | null)}
	{#if node.kind === 'root-file'}
		<a
			href={fileHref(node.file.path)}
			class="flex items-center gap-1.5 rounded px-1 py-1 text-sm hover:bg-accent"
			data-testid="file-row"
		>
			{@render fileIcon(node.file.path)}
			<span class="min-w-0 truncate">{node.file.path}</span>
			{#if node.file.description}
				<span class="ml-auto shrink-0 text-xs text-muted-foreground">{node.file.description}</span>
			{/if}
		</a>
	{:else if node.kind === 'single-file-folder'}
		<a
			href={fileHref(node.file.path)}
			class="flex items-center gap-1.5 rounded px-1 py-1 text-sm hover:bg-accent"
			data-testid="file-row"
		>
			{@render fileIcon(node.file.path)}
			<span class="min-w-0 truncate">
				<span class="text-muted-foreground">{node.folder}</span>{node.filename}
			</span>
			{#if node.file.description}
				<span class="ml-auto shrink-0 text-xs text-muted-foreground">{node.file.description}</span>
			{/if}
		</a>
	{:else if node.kind === 'multi-file-folder'}
		{@const folderKey = groupKey ? `${groupKey}:${node.folder}` : node.folder}
		{@const folderExpanded = isExpanded(folderKey)}
		<div data-testid="subfolder-group">
			<button
				class="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-sm hover:bg-accent"
				onclick={() => toggle(folderKey)}
				aria-expanded={folderExpanded}
				data-testid="collapse-toggle"
			>
				<!-- Chevron -->
				<svg
					class="size-3 shrink-0 text-muted-foreground transition-transform duration-200 {folderExpanded
						? 'rotate-0'
						: '-rotate-90'}"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"
					/>
				</svg>

				<!-- Folder icon -->
				<svg
					class="size-3.5 shrink-0 text-muted-foreground"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"
					/>
				</svg>

				<span class="font-medium">{node.folder}</span>
				<span class="ml-auto text-xs text-muted-foreground">
					{node.files.length}
					{node.files.length === 1 ? 'file' : 'files'}
				</span>
			</button>

			<!-- Collapsible body -->
			<div
				class="grid"
				style="grid-template-rows: {folderExpanded
					? '1fr'
					: '0fr'}; transition: grid-template-rows 200ms ease;"
			>
				<div class="overflow-hidden">
					<div class="space-y-1 pl-[22px] pt-0.5">
						{#each node.files as file (file.id)}
							<a
								href={fileHref(file.path)}
								class="flex items-center gap-1.5 rounded px-1 py-1 text-sm hover:bg-accent"
								data-testid="file-row"
							>
								{@render fileIcon(file.path)}
								<span class="min-w-0 truncate">{getFilename(file.path)}</span>
								{#if file.description}
									<span class="ml-auto shrink-0 text-xs text-muted-foreground"
										>{file.description}</span
									>
								{/if}
							</a>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
{/snippet}

{#snippet fileIcon(path: string)}
	{@const ext = getExtension(path)}
	{#if ext === '.md' || ext === '.mdx'}
		<!-- Markdown icon -->
		<svg
			class="size-3.5 shrink-0 text-blue-500"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M14.85 3c.63 0 1.15.52 1.15 1.15v7.7c0 .63-.52 1.15-1.15 1.15H1.15C.52 13 0 12.48 0 11.85v-7.7C0 3.52.52 3 1.15 3ZM9 11V5H7l-1.5 2L4 5H2v6h2V8l1.5 1.92L7 8v3Zm2.99.5L14.5 8H13V5h-2v3H9.5Z"
			/>
		</svg>
	{:else if ext === '.json' || ext === '.jsonc'}
		<!-- JSON icon (braces) -->
		<svg
			class="size-3.5 shrink-0 text-yellow-600 dark:text-yellow-400"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
			/>
		</svg>
	{:else if ext === '.sh' || ext === '.bash' || ext === '.zsh'}
		<!-- Shell script icon (terminal) -->
		<svg
			class="size-3.5 shrink-0 text-green-600 dark:text-green-400"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM7 11a.75.75 0 0 1 0 1.5H4A.75.75 0 0 1 4 11Zm1.28-5.22a.75.75 0 0 0-1.06-1.06l-3 3a.75.75 0 0 0 0 1.06l3 3a.75.75 0 0 0 1.06-1.06L5.56 8Z"
			/>
		</svg>
	{:else if ext === '.ts' || ext === '.tsx' || ext === '.mts'}
		<!-- TypeScript icon -->
		<svg
			class="size-3.5 shrink-0 text-blue-600 dark:text-blue-400"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
			/>
		</svg>
	{:else if ext === '.js' || ext === '.jsx' || ext === '.mjs'}
		<!-- JavaScript icon -->
		<svg
			class="size-3.5 shrink-0 text-yellow-500"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
			/>
		</svg>
	{:else if ext === '.yml' || ext === '.yaml'}
		<!-- YAML icon -->
		<svg
			class="size-3.5 shrink-0 text-purple-500"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
			/>
		</svg>
	{:else if ext === '.toml'}
		<!-- TOML icon -->
		<svg
			class="size-3.5 shrink-0 text-orange-500"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
			/>
		</svg>
	{:else}
		<!-- Generic file icon -->
		<svg
			class="size-3.5 shrink-0 text-muted-foreground"
			viewBox="0 0 16 16"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"
			/>
		</svg>
	{/if}
{/snippet}
