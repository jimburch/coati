<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import type { ButtonVariant } from '$lib/components/ui/button';

	interface Props {
		active: boolean;
		count: number;
		formAction: string;
		activeIcon: Snippet;
		inactiveIcon: Snippet;
		activeLabel: string;
		inactiveLabel: string;
		variant?: ButtonVariant;
		activeVariant?: ButtonVariant;
		showCount?: boolean;
		activeCountClass?: string;
		class?: string;
		onoptimisticchange?: (active: boolean, count: number) => void;
	}

	const {
		active,
		count,
		formAction,
		activeIcon,
		inactiveIcon,
		activeLabel,
		inactiveLabel,
		variant = 'outline',
		activeVariant,
		showCount = true,
		activeCountClass = 'text-muted-foreground',
		class: className,
		onoptimisticchange
	}: Props = $props();

	let pending = $state<{ active: boolean; count: number } | null>(null);

	const displayActive = $derived(pending !== null ? pending.active : active);
	const displayCount = $derived(pending !== null ? pending.count : count);
	const displayVariant = $derived(displayActive ? (activeVariant ?? variant) : variant);
	const displayCountClass = $derived(displayActive ? activeCountClass : 'text-muted-foreground');
</script>

<form
	method="POST"
	action={formAction}
	use:enhance={() => {
		const optimisticCount = active ? count - 1 : count + 1;
		pending = { active: !active, count: optimisticCount };
		onoptimisticchange?.(!active, optimisticCount);

		return async ({ result, update }) => {
			if (result.type === 'failure' || result.type === 'error') {
				pending = null;
				onoptimisticchange?.(active, count);
			} else {
				await update({ reset: false });
				pending = null;
			}
		};
	}}
>
	<Button type="submit" variant={displayVariant} class={className}>
		{#if displayActive}
			{@render activeIcon()}
			{activeLabel}
		{:else}
			{@render inactiveIcon()}
			{inactiveLabel}
		{/if}
		{#if showCount !== false}
			<span class={displayCountClass}>{displayCount}</span>
		{/if}
	</Button>
</form>
