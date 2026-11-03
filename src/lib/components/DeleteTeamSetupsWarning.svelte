<script lang="ts">
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

	interface Props {
		/** How many Setups the Team owns. They are deleted with the Team. */
		setupsCount: number;
	}

	let { setupsCount }: Props = $props();
</script>

<div
	class="flex gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
	role="alert"
	data-testid="delete-team-setups-warning"
>
	<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
	{#if setupsCount === 0}
		<p>Any setups owned by this team are deleted with it.</p>
	{:else}
		<p>
			<strong>{setupsCount} {setupsCount === 1 ? 'setup' : 'setups'}</strong> owned by this team
			{setupsCount === 1 ? 'is' : 'are'} deleted too, with {setupsCount === 1 ? 'its' : 'their'}
			files, stars and comments. Members' personal setups are not affected.
		</p>
	{/if}
</div>
