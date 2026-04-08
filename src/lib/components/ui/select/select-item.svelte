<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Select as SelectPrimitive } from 'bits-ui';
	import Check from '@lucide/svelte/icons/check';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		children: itemChildren,
		value,
		label,
		disabled,
		...restProps
	}: SelectPrimitive.ItemProps & { children?: Snippet } = $props();
</script>

<SelectPrimitive.Item
	bind:ref
	data-slot="select-item"
	{value}
	{label}
	{disabled}
	class={cn(
		'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
		className
	)}
	{...restProps}
>
	{#snippet children({ selected })}
		<span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
			{#if selected}
				<Check class="h-4 w-4" />
			{/if}
		</span>
		{@render itemChildren?.()}
	{/snippet}
</SelectPrimitive.Item>
