<script lang="ts">
	import { Copy, Check } from '@lucide/svelte';

	interface Props {
		code: string;
		language?: string;
		label?: string;
	}

	const { code, language, label }: Props = $props();

	let copied = $state(false);

	const headerLabel = $derived(() => {
		if (label !== undefined) return label;
		if (language) return language.charAt(0).toUpperCase() + language.slice(1);
		return '';
	});

	async function handleCopy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="overflow-hidden rounded-lg border border-border bg-muted/50">
	{#if headerLabel()}
		<div
			class="flex items-center justify-between border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground"
		>
			<span class="font-medium">{headerLabel()}</span>
			<button
				onclick={handleCopy}
				class="rounded p-1 transition-colors hover:bg-accent hover:text-foreground"
				aria-label={copied ? 'Copied!' : 'Copy code'}
			>
				{#if copied}
					<Check class="size-4 text-green-500" />
				{:else}
					<Copy class="size-4" />
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex justify-end border-b border-border bg-muted px-4 py-2">
			<button
				onclick={handleCopy}
				class="rounded p-1 transition-colors hover:bg-accent hover:text-foreground"
				aria-label={copied ? 'Copied!' : 'Copy code'}
			>
				{#if copied}
					<Check class="size-4 text-green-500" />
				{:else}
					<Copy class="size-4" />
				{/if}
			</button>
		</div>
	{/if}
	<pre class="overflow-x-auto p-4 text-sm leading-relaxed text-foreground"><code
			class={language ? `language-${language}` : ''}>{code}</code
		></pre>
</div>
