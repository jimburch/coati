<script lang="ts">
	import { onMount } from 'svelte';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
	import ActivityFeed from './ActivityFeed.svelte';
	import type { FeedItem } from '$lib/server/queries/activities';

	const DISMISS_KEY = 'activity-follow-cta-dismissed';
	type EmptyState = 'none' | 'zero';
	function resolveEmptyState(items: FeedItem[]): EmptyState {
		return items.length === 0 ? 'zero' : 'none';
	}
	function shouldShowFollowCta(items: FeedItem[], dismissed: boolean): boolean {
		if (dismissed) return false;
		if (items.length === 0) return false;
		return items.every((i) => i.isPopular === true);
	}

	type Props = {
		items: FeedItem[];
	};
	const { items }: Props = $props();

	let dismissed = $state(false);

	onMount(() => {
		try {
			dismissed = localStorage.getItem(DISMISS_KEY) === '1';
		} catch {
			dismissed = false;
		}
	});

	function dismissCta() {
		dismissed = true;
		try {
			localStorage.setItem(DISMISS_KEY, '1');
		} catch {
			/* ignore quota / privacy mode */
		}
	}

	const emptyState = $derived(resolveEmptyState(items));
	const showCta = $derived(shouldShowFollowCta(items, dismissed));
</script>

<section data-testid="activity-panel">
	<div class="mb-3">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity</h2>
	</div>

	{#if showCta}
		<div
			class="mb-3 flex items-start justify-between gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs"
			data-testid="follow-cta"
		>
			<span>
				Follow people to personalize your feed
				<a href="/explore" class="ml-1 font-medium underline">→</a>
			</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground"
				onclick={dismissCta}
				aria-label="Dismiss">×</button
			>
		</div>
	{/if}

	{#if emptyState === 'zero'}
		<div class="rounded-md border border-dashed border-border px-4 py-8 text-center">
			<p class="text-sm text-muted-foreground">No activity yet.</p>
			<a href="/explore" class="mt-2 inline-block text-xs font-medium underline"
				>Follow people to see what they're up to →</a
			>
		</div>
	{:else}
		<ActivityFeed {items} emptyMessage="No recent activity." paginationEndpoint="/api/v1/feed" />
	{/if}

	{#if emptyState === 'none'}
		<div class="mt-4 flex justify-end">
			<a
				href="/feed"
				class={buttonVariants({ variant: 'ghost', size: 'sm' })}
				data-testid="see-all-link">See all →</a
			>
		</div>
	{/if}
</section>
