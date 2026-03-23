<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		isFollowing: boolean;
		followersCount: number;
		formAction?: string;
		onoptimisticchange?: (following: boolean) => void;
	}

	const {
		isFollowing,
		followersCount,
		formAction = '?/follow',
		onoptimisticchange
	}: Props = $props();

	let pending = $state<{ following: boolean; count: number } | null>(null);

	const displayFollowing = $derived(pending !== null ? pending.following : isFollowing);
	const displayCount = $derived(pending !== null ? pending.count : followersCount);
</script>

<form
	method="POST"
	action={formAction}
	use:enhance={() => {
		const optimisticCount = isFollowing ? followersCount - 1 : followersCount + 1;
		pending = {
			following: !isFollowing,
			count: optimisticCount
		};
		onoptimisticchange?.(!isFollowing);

		return async ({ result, update }) => {
			if (result.type === 'failure' || result.type === 'error') {
				pending = null;
				onoptimisticchange?.(isFollowing);
			} else {
				await update({ reset: false });
				pending = null;
			}
		};
	}}
>
	<Button type="submit" variant={displayFollowing ? 'default' : 'outline'} class="gap-2">
		{#if displayFollowing}
			<svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M1.75 2A1.75 1.75 0 0 0 0 3.75v.736a.75.75 0 0 0 1.5 0V3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v7.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25V10.5a.75.75 0 0 0-1.5 0v.986A1.75 1.75 0 0 0 1.75 13.25h8.5A1.75 1.75 0 0 0 12 11.5v-7.5A1.75 1.75 0 0 0 10.25 2h-8.5ZM16 7.25a.75.75 0 0 0-.22-.53l-2.25-2.25a.75.75 0 0 0-1.06 1.06L13.69 6.75H5.75a.75.75 0 0 0 0 1.5h7.94l-1.22 1.22a.75.75 0 1 0 1.06 1.06l2.25-2.25A.75.75 0 0 0 16 7.25Z"
				/>
			</svg>
			Following
		{:else}
			<svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M1.75 2A1.75 1.75 0 0 0 0 3.75v.736a.75.75 0 0 0 1.5 0V3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v7.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25V10.5a.75.75 0 0 0-1.5 0v.986A1.75 1.75 0 0 0 1.75 13.25h8.5A1.75 1.75 0 0 0 12 11.5v-7.5A1.75 1.75 0 0 0 10.25 2h-8.5ZM16 7.25a.75.75 0 0 0-.22-.53l-2.25-2.25a.75.75 0 0 0-1.06 1.06L13.69 6.75H5.75a.75.75 0 0 0 0 1.5h7.94l-1.22 1.22a.75.75 0 1 0 1.06 1.06l2.25-2.25A.75.75 0 0 0 16 7.25Z"
				/>
			</svg>
			Follow
		{/if}
		<span class={displayFollowing ? 'opacity-75' : 'text-muted-foreground'}>{displayCount}</span>
	</Button>
</form>
