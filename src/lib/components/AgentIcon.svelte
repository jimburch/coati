<script lang="ts">
	import { getAgentIcon } from '$lib/utils/agent-icons.js';

	interface Props {
		slug: string;
		size?: number;
		class?: string;
	}

	const { slug, size = 24, class: className = '' }: Props = $props();

	const svgContent = $derived(getAgentIcon(slug));
</script>

{#if svgContent}
	<span
		class="agent-icon inline-flex shrink-0 items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-full {className}"
		style="width:{size}px;height:{size}px"
		aria-hidden="true"
	>
		{@html svgContent}
	</span>
{/if}
