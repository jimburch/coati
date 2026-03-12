<script lang="ts">
	import { Input } from '$lib/components/ui/input';
</script>

<div class="relative hidden sm:block">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		stroke-width="2"
	>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</svg>
	<Input
		type="search"
		placeholder="Search setups..."
		class="h-9 w-64 pl-9"
	/>
</div>
