<script lang="ts">
	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let errorMessage = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!email) return;

		status = 'loading';

		try {
			const res = await fetch('https://buttondown.com/api/emails/embed-subscribe/coati', {
				method: 'POST',
				mode: 'no-cors',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ email, tag: 'landing-page' })
			});

			// With no-cors mode, response is opaque (status 0) — we can't read it,
			// but the request still reaches Buttondown successfully
			if (res.type === 'opaque' || res.ok || res.status === 303) {
				status = 'success';
				email = '';
			} else {
				status = 'error';
				errorMessage = 'Something went wrong. Please try again.';
			}
		} catch {
			status = 'error';
			errorMessage = 'Something went wrong. Please try again.';
		}
	}
</script>

{#if status === 'success'}
	<div class="rounded-lg border border-primary/30 bg-primary/10 px-6 py-4 text-center">
		<p class="font-medium text-primary">Thanks! We'll let you know when Coati launches.</p>
	</div>
{:else}
	<form onsubmit={handleSubmit} class="flex w-full max-w-md flex-col gap-2 sm:flex-row">
		<input
			type="email"
			bind:value={email}
			placeholder="you@example.com"
			required
			class="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
		/>
		<button
			type="submit"
			disabled={status === 'loading'}
			class="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
		>
			{status === 'loading' ? 'Joining...' : 'Get notified'}
		</button>
	</form>
	{#if status === 'error'}
		<p class="mt-2 text-sm text-red-400">{errorMessage}</p>
	{/if}
{/if}
