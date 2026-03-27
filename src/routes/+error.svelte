<script lang="ts">
	import { page } from '$app/stores';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';

	const is404 = $derived($page.status === 404);
</script>

<div class="flex flex-col items-center justify-center px-4 py-16 text-center lg:py-24">
	<p class="select-none text-[8rem] font-bold leading-none text-foreground/10 lg:text-[12rem]">
		{$page.status}
	</p>

	<h1 class="-mt-4 text-2xl font-semibold text-foreground lg:text-3xl">
		{#if is404}
			Page not found
		{:else}
			Something went wrong
		{/if}
	</h1>

	<p class="mt-3 max-w-sm text-sm text-muted-foreground">
		{#if is404}
			The URL you're looking for doesn't exist. It may have been moved, deleted, or you may have
			mistyped the address.
		{:else}
			An unexpected error occurred. Please try again, or go back to somewhere safe.
		{/if}
	</p>

	<div class="mt-6 flex items-center gap-4 lg:mt-8">
		<a href="/" class={buttonVariants({ variant: 'default' })}>Go home</a>
		<button
			class="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
			onclick={() => history.back()}
		>
			Go back
		</button>
	</div>
</div>
