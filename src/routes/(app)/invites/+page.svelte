<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import type { PageData, ActionData } from './$types';

	const { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Pending Invites - Coati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-6 lg:py-10">
	<h1 class="mb-6 text-xl font-bold text-foreground lg:text-2xl">Pending Invites</h1>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}

	{#if form?.acceptSuccess}
		<div
			class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
		>
			You have joined the team.
		</div>
	{/if}

	{#if form?.declineSuccess}
		<div
			class="mb-4 rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
		>
			Invite declined.
		</div>
	{/if}

	{#if data.invites.length === 0}
		<p class="text-sm text-muted-foreground">No pending invites.</p>
	{:else}
		<div class="space-y-3">
			{#each data.invites as invite (invite.id)}
				<div class="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
					<Avatar class="h-10 w-10 flex-shrink-0">
						{#if invite.teamAvatarUrl}
							<AvatarImage src={invite.teamAvatarUrl} alt={invite.teamName} />
						{/if}
						<AvatarFallback class="text-sm font-semibold">
							{invite.teamName[0].toUpperCase()}
						</AvatarFallback>
					</Avatar>

					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold text-foreground">
							<a href="/org/{invite.teamSlug}" class="hover:text-primary">{invite.teamName}</a>
						</p>
						{#if invite.invitedByUsername}
							<p class="text-xs text-muted-foreground">
								Invited by <a href="/{invite.invitedByUsername}" class="hover:text-foreground"
									>@{invite.invitedByUsername}</a
								>
							</p>
						{/if}
					</div>

					<div class="flex flex-shrink-0 gap-2">
						<form
							method="POST"
							action="?/accept"
							use:enhance={() => {
								return ({ update }) => update({ invalidateAll: true });
							}}
						>
							<input type="hidden" name="token" value={invite.token} />
							<Button type="submit" size="sm">Accept</Button>
						</form>
						<form
							method="POST"
							action="?/decline"
							use:enhance={() => {
								return ({ update }) => update({ invalidateAll: true });
							}}
						>
							<input type="hidden" name="token" value={invite.token} />
							<Button type="submit" variant="outline" size="sm">Decline</Button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
