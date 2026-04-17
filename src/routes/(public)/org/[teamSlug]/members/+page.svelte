<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import type { PageData, ActionData } from './$types';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	const team = $derived(data.team);
	const members = $derived(data.members);
	const isOwner = $derived(data.isOwner);
	const currentUserId = $derived(data.currentUserId);

	let inviteUsername = $state('');

	function roleBadgeClass(role: string, isTeamOwner: boolean) {
		if (isTeamOwner) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
		if (role === 'admin') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
		return 'bg-muted text-muted-foreground';
	}

	function roleLabel(role: string, isTeamOwner: boolean) {
		if (isTeamOwner) return 'Owner';
		if (role === 'admin') return 'Admin';
		return 'Member';
	}
</script>

<svelte:head>
	<title>{team.name} Members - Coati</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6 lg:py-10">
	<div class="mb-6 flex items-center justify-between lg:mb-8">
		<div>
			<a
				href="/org/{team.slug}"
				class="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			>
				&larr; {team.name}
			</a>
			<h1 class="text-xl font-bold text-foreground lg:text-2xl">Members</h1>
		</div>
	</div>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}

	{#if form?.inviteSuccess}
		<div
			class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
		>
			Invite sent to @{form.invitedUsername}
		</div>
	{/if}

	{#if isOwner || data.members.some((m) => m.userId === currentUserId && m.role === 'admin')}
		<div class="mb-6 rounded-lg border border-border bg-card p-4">
			<h2 class="mb-3 text-sm font-semibold text-foreground">Invite member</h2>
			<form
				method="POST"
				action="?/inviteMember"
				use:enhance={() => {
					return ({ result, update }) => {
						if (result.type === 'success') inviteUsername = '';
						update();
					};
				}}
				class="flex gap-2"
			>
				<Input
					type="text"
					name="username"
					bind:value={inviteUsername}
					placeholder="Username"
					class="h-9 flex-1 text-sm"
					required
				/>
				<Button type="submit" size="sm" class="shrink-0">Invite</Button>
			</form>
		</div>
	{/if}

	<div class="space-y-2">
		{#each members as member (member.userId)}
			{@const memberIsOwner = member.userId === team.ownerId}
			<div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
				<Avatar class="h-9 w-9 flex-shrink-0">
					{#if member.avatarUrl}
						<AvatarImage src={member.avatarUrl} alt={member.username} />
					{/if}
					<AvatarFallback class="text-sm font-semibold">
						{member.username[0].toUpperCase()}
					</AvatarFallback>
				</Avatar>

				<div class="min-w-0 flex-1">
					<a
						href="/{member.username}"
						class="block truncate text-sm font-semibold text-foreground hover:text-primary"
					>
						{member.name ?? member.username}
					</a>
					{#if member.name}
						<p class="text-xs text-muted-foreground">@{member.username}</p>
					{/if}
				</div>

				<div class="flex flex-shrink-0 items-center gap-2">
					<span
						class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {roleBadgeClass(
							member.role,
							memberIsOwner
						)}"
					>
						{roleLabel(member.role, memberIsOwner)}
					</span>

					{#if isOwner && !memberIsOwner}
						<form method="POST" action="?/changeRole" use:enhance class="flex items-center gap-1">
							<input type="hidden" name="userId" value={member.userId} />
							<select
								name="role"
								value={member.role}
								class="rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							>
								<option value="admin">Admin</option>
								<option value="member">Member</option>
							</select>
							<Button type="submit" variant="outline" size="sm" class="text-xs">Save</Button>
						</form>
					{/if}

					{#if !memberIsOwner && (isOwner || member.userId === currentUserId)}
						<form method="POST" action="?/removeMember" use:enhance>
							<input type="hidden" name="userId" value={member.userId} />
							<Button type="submit" variant="destructive" size="sm" class="text-xs">
								{member.userId === currentUserId ? 'Leave' : 'Remove'}
							</Button>
						</form>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<p class="mt-4 text-xs text-muted-foreground">
		{members.length}
		{members.length === 1 ? 'member' : 'members'}
	</p>
</div>
