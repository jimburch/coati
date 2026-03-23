<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		isStarred: boolean;
		starsCount: number;
		formAction?: string;
		onoptimisticchange?: (count: number) => void;
	}

	const { isStarred, starsCount, formAction = '?/star', onoptimisticchange }: Props = $props();

	let pending = $state<{ starred: boolean; count: number } | null>(null);

	const displayStarred = $derived(pending !== null ? pending.starred : isStarred);
	const displayCount = $derived(pending !== null ? pending.count : starsCount);
</script>

<form
	method="POST"
	action={formAction}
	use:enhance={() => {
		const optimisticCount = isStarred ? starsCount - 1 : starsCount + 1;
		pending = {
			starred: !isStarred,
			count: optimisticCount
		};
		onoptimisticchange?.(optimisticCount);

		return async ({ result, update }) => {
			if (result.type === 'failure' || result.type === 'error') {
				pending = null;
				onoptimisticchange?.(starsCount);
			} else {
				// Keep pending until revalidation completes so UI doesn't flicker back
				await update({ reset: false });
				pending = null;
			}
		};
	}}
>
	<Button type="submit" variant="outline" class="w-full gap-2">
		{#if displayStarred}
			<svg class="size-4 fill-yellow-500 text-yellow-500" viewBox="0 0 16 16">
				<path
					d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
				/>
			</svg>
			Starred
		{:else}
			<svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Zm0 2.445L6.615 5.5a.75.75 0 0 1-.564.41l-3.097.45 2.24 2.184a.75.75 0 0 1 .216.664l-.528 3.084 2.769-1.456a.75.75 0 0 1 .698 0l2.77 1.456-.53-3.084a.75.75 0 0 1 .216-.664l2.24-2.183-3.096-.45a.75.75 0 0 1-.564-.41L8 2.694Z"
				/>
			</svg>
			Star
		{/if}
		<span class="text-muted-foreground">{displayCount}</span>
	</Button>
</form>
