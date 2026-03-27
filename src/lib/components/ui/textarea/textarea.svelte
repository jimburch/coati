<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...restProps
	}: Props = $props();
</script>

<textarea
	bind:this={ref}
	data-slot="textarea"
	class={cn(
		'border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex min-h-[60px] w-full rounded-md border px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
		className
	)}
	bind:value
	{...restProps}
></textarea>
