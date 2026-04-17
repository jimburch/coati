<script lang="ts">
	interface Props {
		username: string;
		slug: string;
	}

	const { username, slug }: Props = $props();

	const cloneCommand = $derived(`npx @coati/sh@latest clone ${username}/${slug}`);
	let copied = $state(false);

	function copyCloneCommand() {
		navigator.clipboard.writeText(cloneCommand);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex items-center gap-1 rounded-md border border-border bg-muted p-2">
	<code class="flex-1 truncate text-xs">{cloneCommand}</code>
	<button
		onclick={copyCloneCommand}
		class="shrink-0 rounded p-1 hover:bg-accent"
		aria-label="Copy clone command"
	>
		{#if copied}
			<svg class="size-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
				/>
			</svg>
		{:else}
			<svg class="size-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"
				/>
				<path
					d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
				/>
			</svg>
		{/if}
	</button>
</div>
