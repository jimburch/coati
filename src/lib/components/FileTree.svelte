<script lang="ts">
	import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from '@lucide/svelte';

	interface Props {
		files: Array<{ source: string; id: string }>;
		selectedPath: string;
		basePath: string;
	}

	const { files, selectedPath, basePath }: Props = $props();

	interface TreeNode {
		name: string;
		path: string;
		isDir: boolean;
		children: TreeNode[];
	}

	function buildTree(flatFiles: Array<{ source: string; id: string }>): TreeNode[] {
		const root: TreeNode[] = [];

		for (const file of flatFiles) {
			const parts = file.source.split('/');
			let current = root;

			for (let i = 0; i < parts.length; i++) {
				const name = parts[i];
				const path = parts.slice(0, i + 1).join('/');
				const isDir = i < parts.length - 1;

				let existing = current.find((n) => n.name === name && n.isDir === isDir);
				if (!existing) {
					existing = { name, path, isDir, children: [] };
					current.push(existing);
				}
				current = existing.children;
			}
		}

		function sortNodes(nodes: TreeNode[]): TreeNode[] {
			return nodes
				.sort((a, b) => {
					if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
					return a.name.localeCompare(b.name);
				})
				.map((n) => ({ ...n, children: sortNodes(n.children) }));
		}

		return sortNodes(root);
	}

	const tree = $derived(buildTree(files));

	let expandedDirs = $state(new Set<string>());

	// Initialize all directories as expanded
	$effect(() => {
		const dirs = new Set<string>();
		for (const file of files) {
			const parts = file.source.split('/');
			for (let i = 1; i < parts.length; i++) {
				dirs.add(parts.slice(0, i).join('/'));
			}
		}
		expandedDirs = dirs;
	});

	function toggleDir(path: string) {
		const next = new Set(expandedDirs);
		if (next.has(path)) {
			next.delete(path);
		} else {
			next.add(path);
		}
		expandedDirs = next;
	}
</script>

{#snippet renderNode(node: TreeNode, depth: number)}
	{#if node.isDir}
		<button
			class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent"
			style="padding-left: {depth * 12 + 8}px"
			onclick={() => toggleDir(node.path)}
		>
			{#if expandedDirs.has(node.path)}
				<ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
				<FolderOpen class="size-4 shrink-0 text-muted-foreground" />
			{:else}
				<ChevronRight class="size-3.5 shrink-0 text-muted-foreground" />
				<Folder class="size-4 shrink-0 text-muted-foreground" />
			{/if}
			<span class="truncate">{node.name}</span>
		</button>
		{#if expandedDirs.has(node.path)}
			{#each node.children as child (child.path)}
				{@render renderNode(child, depth + 1)}
			{/each}
		{/if}
	{:else}
		<a
			href="{basePath}?file={encodeURIComponent(node.path)}"
			class="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent {node.path === selectedPath ? 'bg-accent font-medium' : ''}"
			style="padding-left: {depth * 12 + 8}px"
		>
			<File class="size-4 shrink-0 text-muted-foreground" />
			<span class="truncate">{node.name}</span>
		</a>
	{/if}
{/snippet}

<nav class="space-y-0.5">
	{#each tree as node (node.path)}
		{@render renderNode(node, 0)}
	{/each}
</nav>
