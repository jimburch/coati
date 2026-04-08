<script lang="ts">
	import { navigating } from '$app/stores';
	import { onMount } from 'svelte';
	import { untrack } from 'svelte';

	let mounted = $state(false);
	let visible = $state(false);
	let completing = $state(false);
	let hideTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		mounted = true;
	});

	$effect(() => {
		const isNavigating = !!$navigating;
		const isMounted = mounted;

		untrack(() => {
			if (!isMounted) return;

			if (isNavigating) {
				if (hideTimer) {
					clearTimeout(hideTimer);
					hideTimer = null;
				}
				visible = true;
				completing = false;
			} else if (visible && !completing) {
				completing = true;
				hideTimer = setTimeout(() => {
					visible = false;
					completing = false;
					hideTimer = null;
				}, 500);
			}
		});
	});
</script>

{#if visible}
	<div
		class="nav-progress-bar"
		class:completing
		aria-hidden="true"
		data-testid="nav-progress-bar"
	></div>
{/if}

<style>
	.nav-progress-bar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 3px;
		z-index: 9999;
		pointer-events: none;
		overflow: hidden;
	}

	.nav-progress-bar::after {
		content: '';
		position: absolute;
		top: 0;
		height: 100%;
		width: 45%;
		background: hsl(var(--primary));
		animation: nav-slide 1.5s ease-in-out infinite;
	}

	.nav-progress-bar.completing::after {
		animation: nav-complete 0.5s ease forwards;
	}

	@keyframes nav-slide {
		0% {
			left: -45%;
		}
		100% {
			left: 100%;
		}
	}

	@keyframes nav-complete {
		0% {
			left: 0;
			width: 100%;
			opacity: 1;
		}
		50% {
			left: 0;
			width: 100%;
			opacity: 1;
		}
		100% {
			left: 0;
			width: 100%;
			opacity: 0;
		}
	}
</style>
