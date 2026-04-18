<script lang="ts">
	type Agent = {
		id: string;
		slug: string;
		displayName: string;
	};

	type Props = {
		agents: Agent[];
	};

	const { agents }: Props = $props();
</script>

{#if agents.length > 0}
	<div class="rounded-lg border border-border bg-card px-4 py-3">
		<h2 class="mb-2 text-sm font-semibold text-foreground">Agents</h2>
		<div class="flex flex-wrap gap-1.5">
			{#each agents as agent (agent.id)}
				<a
					href="/explore?agent={agent.slug}"
					class="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
				>
					{agent.displayName}
				</a>
			{/each}
		</div>
	</div>
{/if}
