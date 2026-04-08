<script lang="ts">
	const { title, subtitle = '' }: { title: string; subtitle?: string } = $props();
</script>

<div class="mb-12 text-center">
	<h2 class="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
	{#if subtitle}
		<p class="mt-3 text-lg text-muted-foreground">{subtitle}</p>
	{/if}
</div>
