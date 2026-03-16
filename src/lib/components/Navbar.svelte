<script lang="ts">
	import { browser } from '$app/environment';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import SearchBar from './SearchBar.svelte';
	import UserMenu from './UserMenu.svelte';
	import type { LayoutUser } from '$lib/types';

	let { user }: { user: LayoutUser | null } = $props();
</script>

<header class="bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<div class="flex items-center gap-6">
			<a href="/" class="text-lg font-bold">Magpie</a>
			<a
				href="/explore"
				class="text-sm text-muted-foreground transition-colors hover:text-foreground">Explore</a
			>
		</div>

		<SearchBar />

		<div>
			{#if user}
				{#if browser}
					<UserMenu {user} />
				{:else}
					<div
						class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted"
					>
						{#if user.avatarUrl}
							<img src={user.avatarUrl} alt={user.username} class="h-full w-full object-cover" />
						{:else}
							<span class="text-sm font-medium">{user.username[0].toUpperCase()}</span>
						{/if}
					</div>
				{/if}
			{:else}
				<a href="/auth/login/github" class={buttonVariants({ variant: 'default', size: 'sm' })}
					>Sign in</a
				>
			{/if}
		</div>
	</div>
</header>
