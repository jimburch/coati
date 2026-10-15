<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import FeedbackWidget from '$lib/components/FeedbackWidget.svelte';
	import GuideNudge from '$lib/components/GuideNudge.svelte';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';
	import { Toaster } from 'svelte-sonner';
	import '../app.css';

	let { data, children } = $props();

	// mixpanel-browser is client-only. A static import here would ship it in the
	// Worker and spend cold-start CPU parsing it. `browser` is false in the
	// server build, so this branch is dropped from the Worker.
	type Analytics = typeof import('$lib/observability/mixpanel-client');
	const analyticsReady: Promise<Analytics | null> = browser
		? import('$lib/observability/mixpanel-client').then((mod) => {
				mod.initMixpanelClient();
				return mod;
			})
		: Promise.resolve(null);

	afterNavigate(() => {
		void analyticsReady.then((mod) => mod?.pageview());
	});

	$effect(() => {
		const user = data.user;
		if (!user) return;
		void analyticsReady.then((mod) => mod?.identify(user.id, { username: user.username }));
	});
</script>

<div class="flex min-h-screen flex-col">
	<Navbar user={data.user} pendingInviteCount={data.pendingInviteCount ?? 0} />
	<main class="flex-1 pt-14">
		{@render children()}
	</main>
	<Footer />
	<GuideNudge user={data.user} />
	<FeedbackWidget user={data.user} />
	<NavigationProgress />
	<Toaster richColors />
</div>
