<script lang="ts">
	import type { Component } from 'svelte';

	const {
		icon: Icon,
		title,
		description
	}: { icon: Component; title: string; description: string } = $props();
</script>

<div class="rounded-xl border border-border bg-card p-6">
	<div class="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
		<Icon class="size-5 text-primary" />
	</div>
	<h3 class="text-base font-semibold text-foreground">{title}</h3>
	<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
</div>
