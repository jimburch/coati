<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate, goto, invalidateAll } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import { Input } from '$lib/components/ui/input';
	import SearchBar from './SearchBar.svelte';
	import UserMenu from './UserMenu.svelte';
	import type { LayoutUser } from '$lib/types';

	let { user }: { user: LayoutUser | null } = $props();

	let menuOpen = $state(false);
	let mobileQuery = $state('');

	function toggleMenu() {
		menuOpen = !menuOpen;
	}

	function closeMenu() {
		menuOpen = false;
	}

	function handleMobileSearch(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = mobileQuery.trim();
		if (trimmed) {
			goto(`/explore?q=${encodeURIComponent(trimmed)}`);
		} else {
			goto('/explore');
		}
	}

	async function signOut() {
		await fetch('/auth/logout', { method: 'POST' });
		await invalidateAll();
		await goto('/');
	}

	afterNavigate(() => {
		menuOpen = false;
	});
</script>

<header class="bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
	<div class="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
		<div class="flex items-center gap-6">
			<a href="/" class="text-lg font-bold">Coati</a>
			<a
				href="/explore"
				class="hidden text-sm text-muted-foreground transition-colors hover:text-foreground lg:block"
				>Explore</a
			>
		</div>

		<div class="hidden lg:block">
			<SearchBar />
		</div>

		<div class="hidden lg:flex">
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

		<!-- Hamburger button (mobile only) -->
		<button
			class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted lg:hidden"
			onclick={toggleMenu}
			aria-label={menuOpen ? 'Close menu' : 'Open menu'}
			aria-expanded={menuOpen}
		>
			{#if menuOpen}
				<!-- X icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			{:else}
				<!-- Hamburger icon -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			{/if}
		</button>
	</div>
</header>

{#if menuOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-40 bg-black/50"
		onclick={closeMenu}
		transition:fade={{ duration: 150 }}
	></div>

	<!-- Mobile menu panel -->
	<div
		class="fixed left-0 right-0 top-14 z-50 border-b bg-background shadow-lg"
		transition:slide={{ duration: 200 }}
	>
		<nav aria-label="Mobile navigation" class="mx-auto max-w-7xl space-y-1 px-4 py-3">
			<a href="/explore" class="block rounded-md px-3 py-2 text-sm hover:bg-muted">Explore</a>

			<form onsubmit={handleMobileSearch}>
				<div class="relative px-3 py-1">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="text-muted-foreground absolute left-5.5 top-1/2 h-4 w-4 -translate-y-1/2"
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
						class="h-9 w-full pl-9"
						bind:value={mobileQuery}
					/>
				</div>
			</form>

			{#if user}
				<a href="/{user.username}" class="block rounded-md px-3 py-2 text-sm hover:bg-muted"
					>My Profile</a
				>
				<a href="/new" class="block rounded-md px-3 py-2 text-sm hover:bg-muted">New Setup</a>
				<a href="/settings" class="block rounded-md px-3 py-2 text-sm hover:bg-muted">Settings</a>
				<div class="border-t pt-1">
					<button
						onclick={signOut}
						class="block w-full rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
					>
						Sign out
					</button>
				</div>
			{:else}
				<div class="px-3 py-2">
					<a
						href="/auth/login/github"
						class="{buttonVariants({ variant: 'default', size: 'sm' })} w-full justify-center"
					>
						Sign in with GitHub
					</a>
				</div>
			{/if}
		</nav>
	</div>
{/if}
