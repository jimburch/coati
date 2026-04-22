<script lang="ts">
	import CodeBlock from '$lib/components/CodeBlock.svelte';

	interface Props {
		badgeUrl: string;
		setupUrl: string;
	}

	const { badgeUrl, setupUrl }: Props = $props();

	const snippet = $derived(`[![Clone on Coati](${badgeUrl})](${setupUrl})`);
	let open = $state(false);
	let copied = $state(false);

	function copySnippet() {
		navigator.clipboard.writeText(snippet);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div>
	<button
		onclick={() => (open = !open)}
		class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
		aria-expanded={open}
		aria-label="Embed this setup"
		data-testid="embed-toggle-btn"
	>
		<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
			<path
				d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"
			/>
		</svg>
		Embed
	</button>

	{#if open}
		<div
			class="mt-3 space-y-3 rounded-lg border border-border bg-card p-3"
			data-testid="embed-panel"
		>
			<!-- Live badge preview -->
			<div>
				<p class="mb-1.5 text-xs font-medium text-muted-foreground">Preview</p>
				<img src={badgeUrl} alt="Clone on Coati badge" class="h-5" />
			</div>

			<!-- Markdown snippet via CodeBlock -->
			<div>
				<p class="mb-1.5 text-xs font-medium text-muted-foreground">Markdown</p>
				<CodeBlock code={snippet} label="Markdown" />
			</div>

			<!-- Copy snippet button (CloneCommand-style interaction) -->
			<button
				onclick={copySnippet}
				class="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
				aria-label={copied ? 'Copied!' : 'Copy embed snippet'}
				data-testid="copy-snippet-btn"
			>
				{#if copied}
					<svg class="size-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"
						/>
					</svg>
					Copied!
				{:else}
					<svg class="size-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
						<path
							d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"
						/>
						<path
							d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
						/>
					</svg>
					Copy snippet
				{/if}
			</button>
		</div>
	{/if}
</div>
