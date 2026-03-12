<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import SearchBar from './SearchBar.svelte';
	import UserMenu from './UserMenu.svelte';
	import type { LayoutUser } from '$lib/types';

	let { user }: { user: LayoutUser | null } = $props();
</script>

<header class="bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<a href="/" class="text-lg font-bold">Magpie</a>

		<SearchBar />

		<div>
			{#if user}
				<UserMenu {user} />
			{:else}
				<a href="/auth/login/github" class={buttonVariants({ variant: 'default', size: 'sm' })}>Sign in</a>
			{/if}
		</div>
	</div>
</header>
