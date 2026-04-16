<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import FeedbackWidget from '$lib/components/FeedbackWidget.svelte';
	import GuideNudge from '$lib/components/GuideNudge.svelte';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';
	import { Toaster } from 'svelte-sonner';
	import { initMixpanelClient, pageview, identify } from '$lib/observability/mixpanel-client';
	import '../app.css';

	let { data, children } = $props();

	onMount(() => {
		initMixpanelClient();
	});

	afterNavigate(() => {
		pageview();
	});

	$effect(() => {
		if (data.user) {
			identify(data.user.id, { username: data.user.username });
		}
	});
</script>

<div class="flex min-h-screen flex-col">
	<Navbar user={data.user} />
	<main class="flex-1 pt-14">
		{@render children()}
	</main>
	<Footer />
	<GuideNudge user={data.user} />
	<FeedbackWidget user={data.user} />
	<NavigationProgress />
	<Toaster richColors />
</div>
