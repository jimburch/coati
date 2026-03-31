<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Select as SelectPrimitive } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SelectPrimitive.GroupHeadingProps = $props();
</script>

<SelectPrimitive.GroupHeading
	bind:ref
	data-slot="select-label"
	class={cn('py-1.5 pl-2 pr-2 text-xs font-semibold', className)}
	{...restProps}
/>
