<script lang="ts">
	import { Clock } from '@lucide/svelte';
	import { buttonVariants } from '$lib/components/ui/button/button.svelte';
</script>

<svelte:head>
	<title>You're on the Waitlist — Coati</title>
</svelte:head>

<div
	class="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center lg:py-24"
	data-testid="waitlist-page"
>
	<div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
		<Clock class="size-8 text-primary" />
	</div>
	<h1 class="text-2xl font-bold tracking-tight lg:text-3xl" data-testid="waitlist-heading">
		You're on the waitlist
	</h1>
	<p
		class="mt-4 max-w-md text-base leading-relaxed text-muted-foreground"
		data-testid="waitlist-message"
	>
		Coati is currently in private beta. We'll notify you as soon as your account is approved.
	</p>
	<p class="mt-2 text-sm text-muted-foreground">
		Thanks for your patience — we're excited to have you on board!
	</p>
	<div class="mt-8">
		<a href="/" class={buttonVariants({ variant: 'outline' })}>Back to home</a>
	</div>
</div>
