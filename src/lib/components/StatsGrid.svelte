<script lang="ts">
	type Stats = {
		setupsCount: number;
		starsReceived: number;
		clonesTotal: number;
		followingCount: number;
	};

	type Props = { stats: Stats };

	const { stats }: Props = $props();

	const cells = $derived([
		{ label: 'Setups', value: stats.setupsCount },
		{ label: 'Stars received', value: stats.starsReceived },
		{ label: 'Clones', value: stats.clonesTotal },
		{ label: 'Following', value: stats.followingCount }
	]);
</script>

<div class="grid grid-cols-2 gap-2">
	{#each cells as cell (cell.label)}
		<div class="rounded-lg border border-border bg-card p-3 text-center">
			<p class="text-xl font-bold text-foreground">{cell.value}</p>
			<p class="mt-0.5 text-xs text-muted-foreground">{cell.label}</p>
		</div>
	{/each}
</div>
