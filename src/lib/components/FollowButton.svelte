<script lang="ts">
	import ToggleButton from './ToggleButton.svelte';

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
</script>

{#snippet followIcon()}
	<svg class="size-4" viewBox="0 0 16 16" fill="currentColor">
		<path
			d="M1.75 2A1.75 1.75 0 0 0 0 3.75v.736a.75.75 0 0 0 1.5 0V3.75a.25.25 0 0 1 .25-.25h8.5a.25.25 0 0 1 .25.25v7.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25V10.5a.75.75 0 0 0-1.5 0v.986A1.75 1.75 0 0 0 1.75 13.25h8.5A1.75 1.75 0 0 0 12 11.5v-7.5A1.75 1.75 0 0 0 10.25 2h-8.5ZM16 7.25a.75.75 0 0 0-.22-.53l-2.25-2.25a.75.75 0 0 0-1.06 1.06L13.69 6.75H5.75a.75.75 0 0 0 0 1.5h7.94l-1.22 1.22a.75.75 0 1 0 1.06 1.06l2.25-2.25A.75.75 0 0 0 16 7.25Z"
		/>
	</svg>
{/snippet}

<ToggleButton
	active={isFollowing}
	count={followersCount}
	{formAction}
	activeIcon={followIcon}
	inactiveIcon={followIcon}
	activeLabel="Following"
	inactiveLabel="Follow"
	variant="outline"
	activeVariant="default"
	activeCountClass="opacity-75"
	onoptimisticchange={(active) => onoptimisticchange?.(active)}
/>
