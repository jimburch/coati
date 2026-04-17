<script lang="ts">
	import { page } from '$app/stores';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const token = $derived($page.params.token);
	const invite = $derived(data.invite);
	const valid = $derived(data.valid);
	const user = $derived(data.user);

	let joining = $state(false);
	let joinError = $state('');
	let joined = $state(false);

	async function handleJoin() {
		joining = true;
		joinError = '';
		try {
			const res = await fetch(`/api/v1/invites/${token}/accept`, { method: 'POST' });
			const json = await res.json();
			if (res.ok) {
				joined = true;
			} else {
				joinError = json.error ?? 'Failed to join team';
			}
		} catch {
			joinError = 'Something went wrong. Please try again.';
		} finally {
			joining = false;
		}
	}
</script>

<svelte:head>
	<title>
		{invite ? `Join ${invite.teamName} - Coati` : 'Team Invite - Coati'}
	</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		{#if !invite}
			<div class="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
				<div class="mb-4 text-4xl">🔗</div>
				<h1 class="mb-2 text-xl font-bold text-foreground">Invite not found</h1>
				<p class="text-sm text-muted-foreground">
					This invite link is invalid or no longer exists.
				</p>
				<a href="/" class="mt-6 inline-block">
					<Button variant="outline" size="sm">Go home</Button>
				</a>
			</div>
		{:else if !valid && invite.status === 'accepted'}
			<div class="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
				<div class="mb-4 text-4xl">✅</div>
				<h1 class="mb-2 text-xl font-bold text-foreground">Invite already used</h1>
				<p class="text-sm text-muted-foreground">This invite has already been used.</p>
				<a href="/org/{invite.teamSlug}" class="mt-6 inline-block">
					<Button variant="outline" size="sm">View team</Button>
				</a>
			</div>
		{:else if !valid}
			<div class="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
				<div class="mb-4 text-4xl">⏰</div>
				<h1 class="mb-2 text-xl font-bold text-foreground">Invite expired</h1>
				<p class="text-sm text-muted-foreground">This invite has expired.</p>
				<a href="/" class="mt-6 inline-block">
					<Button variant="outline" size="sm">Go home</Button>
				</a>
			</div>
		{:else if joined}
			<div class="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
				<div class="mb-4 text-4xl">🎉</div>
				<h1 class="mb-2 text-xl font-bold text-foreground">You've joined {invite.teamName}!</h1>
				<p class="mb-6 text-sm text-muted-foreground">You are now a member of the team.</p>
				<a href="/org/{invite.teamSlug}">
					<Button size="sm">Go to team</Button>
				</a>
			</div>
		{:else}
			<div class="rounded-xl border border-border bg-card p-8 shadow-sm">
				<div class="mb-6 text-center">
					<Avatar class="mx-auto mb-3 h-16 w-16">
						{#if invite.teamAvatarUrl}
							<AvatarImage src={invite.teamAvatarUrl} alt={invite.teamName} />
						{/if}
						<AvatarFallback class="text-2xl font-bold">
							{invite.teamName[0].toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<h1 class="text-xl font-bold text-foreground">{invite.teamName}</h1>
					{#if invite.teamDescription}
						<p class="mt-1 text-sm text-muted-foreground">{invite.teamDescription}</p>
					{/if}
				</div>

				{#if invite.invitedByUsername}
					<p class="mb-6 text-center text-sm text-muted-foreground">
						<span class="font-medium text-foreground">@{invite.invitedByUsername}</span> invited you to
						join this team.
					</p>
				{/if}

				{#if joinError}
					<div
						class="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
					>
						{joinError}
					</div>
				{/if}

				{#if !user}
					<a href="/auth/login/github?redirect=/invite/{token}">
						<Button class="w-full" size="sm">Sign in with GitHub to join</Button>
					</a>
				{:else if !user.hasBetaFeatures}
					<div
						class="rounded-md border border-muted bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground"
					>
						This feature isn't available for your account yet.
					</div>
				{:else}
					<Button class="w-full" size="sm" onclick={handleJoin} disabled={joining}>
						{joining ? 'Joining…' : 'Join team'}
					</Button>
				{/if}
			</div>
		{/if}
	</div>
</div>
