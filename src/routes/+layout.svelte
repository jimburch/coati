<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import FeedbackWidget from '$lib/components/FeedbackWidget.svelte';
	import NavigationProgress from '$lib/components/NavigationProgress.svelte';
	import { Toaster } from 'svelte-sonner';
	import '../app.css';

	let { data, children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<Navbar user={data.user} />
	<main class="flex-1">
		{@render children()}
	</main>
	<Footer />
	<FeedbackWidget user={data.user} />
	<NavigationProgress />
	<Toaster richColors />
</div>
