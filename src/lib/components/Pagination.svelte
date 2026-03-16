<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { cn } from '$lib/utils';

	type Props = {
		page: number;
		totalPages: number;
		buildUrl: (page: number) => string;
	};

	const { page, totalPages, buildUrl }: Props = $props();

	function getPageNumbers(current: number, total: number): (number | '...')[] {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

		const pages: (number | '...')[] = [1];

		if (current > 3) pages.push('...');

		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);
		for (let i = start; i <= end; i++) pages.push(i);

		if (current < total - 2) pages.push('...');

		pages.push(total);
		return pages;
	}
</script>

{#if totalPages > 1}
	<nav aria-label="Pagination" class="flex items-center justify-center gap-1">
		{#if page > 1}
			<a
				href={buildUrl(page - 1)}
				class={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
				aria-label="Previous page"
			>
				&lt;
			</a>
		{:else}
			<span
				class={cn(
					buttonVariants({ variant: 'outline', size: 'sm' }),
					'pointer-events-none opacity-50'
				)}
				aria-disabled="true"
			>
				&lt;
			</span>
		{/if}

		{#each getPageNumbers(page, totalPages) as p, i (i)}
			{#if p === '...'}
				<span class="px-2 text-sm text-muted-foreground">...</span>
			{:else if p === page}
				<span class={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
					{p}
				</span>
			{:else}
				<a href={buildUrl(p)} class={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
					{p}
				</a>
			{/if}
		{/each}

		{#if page < totalPages}
			<a
				href={buildUrl(page + 1)}
				class={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
				aria-label="Next page"
			>
				&gt;
			</a>
		{:else}
			<span
				class={cn(
					buttonVariants({ variant: 'outline', size: 'sm' }),
					'pointer-events-none opacity-50'
				)}
				aria-disabled="true"
			>
				&gt;
			</span>
		{/if}
	</nav>
{/if}
