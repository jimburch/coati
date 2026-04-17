<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
</script>

<div
	class="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center"
>
	<p class="text-sm font-medium text-foreground">No setups yet</p>
	<p class="mt-1 text-sm text-muted-foreground">Share your first AI coding workflow.</p>
	<a href="/new" class="{buttonVariants({ variant: 'default', size: 'sm' })} mt-4">
		Create a setup
	</a>
</div>
