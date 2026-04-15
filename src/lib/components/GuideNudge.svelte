<script lang="ts">
	import { browser } from '$app/environment';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { X } from '@lucide/svelte';
	import { buttonVariants } from './ui/button/button.svelte';
	import { cn } from '$lib/utils.js';
	import type { LayoutUser } from '$lib/types';
	import { shouldShowNudge, isGuidePath, GUIDE_DISMISSED_KEY } from '$lib/utils/guide-nudge';

	interface Props {
		user: LayoutUser | null;
	}

	const { user }: Props = $props();

	let dismissed = $state(
		browser && (!!localStorage.getItem(GUIDE_DISMISSED_KEY) || isGuidePath(page.url.pathname))
	);

	// Also handle the case where the page is already /guide on initial load.
	$effect(() => {
		if (browser && isGuidePath(page.url.pathname)) {
			dismiss();
		}
	});

	// Auto-dismiss when the user navigates to /guide.
	afterNavigate(({ to }) => {
		if (to?.url && isGuidePath(to.url.pathname)) {
			dismiss();
		}
	});

	const visible = $derived(browser && shouldShowNudge(user, dismissed));

	function dismiss() {
		if (browser) {
			localStorage.setItem(GUIDE_DISMISSED_KEY, '1');
		}
		dismissed = true;
	}
</script>

{#if visible}
	<div
		class="fixed left-4 top-16 z-40 w-72 rounded-lg border bg-background p-4 shadow-md"
		role="complementary"
		aria-label="Guide nudge"
		data-testid="guide-nudge"
	>
		<button
			onclick={dismiss}
			class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			aria-label="Dismiss"
			data-testid="guide-nudge-dismiss"
		>
			<X class="size-4" />
		</button>
		<p class="pr-6 text-sm font-medium leading-snug text-foreground">
			New to Coati? Learn how to discover and share AI coding setups.
		</p>
		<div class="mt-3">
			<a
				href="/guide"
				class={cn(buttonVariants({ size: 'sm' }), 'w-full justify-center')}
				data-testid="guide-nudge-cta"
			>
				View the Guide
			</a>
		</div>
	</div>
{/if}
