<script lang="ts">
	import { cn } from '$lib/utils.js';

	let { class: className, ...restProps }: { class?: string; [key: string]: unknown } = $props();
</script>

<div
	data-slot="select-separator"
	class={cn('bg-muted -mx-1 my-1 h-px', className)}
	{...restProps}
></div>
