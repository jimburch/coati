<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import {
		AlertDialog,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogFooter,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogCancel
	} from '$lib/components/ui/alert-dialog';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { toast } from 'svelte-sonner';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	let deleteDialogOpen = $state(false);
	let deleteTarget = $state<{ slug: string; name: string } | null>(null);
	let deleteConfirmInput = $state('');
	let deleting = $state(false);

	function openDeleteDialog(slug: string, name: string) {
		deleteTarget = { slug, name };
		deleteConfirmInput = '';
		deleteDialogOpen = true;
	}

	function handleDeleteOpenChange(open: boolean) {
		if (!open) {
			deleteConfirmInput = '';
			deleting = false;
		}
		deleteDialogOpen = open;
	}

	const deleteConfirmValid = $derived(deleteConfirmInput === deleteTarget?.name);

	function formatDate(date: Date | null | undefined): string {
		if (!date) return '—';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Teams - Admin - Coati</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-6 lg:py-10">
	<div class="mb-6 lg:mb-8">
		<h1 class="text-foreground text-xl font-bold lg:text-2xl" data-testid="admin-heading">
			Team Management
		</h1>
		<p class="text-muted-foreground mt-1 text-sm">View and moderate all teams on the platform.</p>
	</div>

	<!-- Search -->
	<form method="GET" class="mb-4 flex gap-2 lg:mb-6" data-testid="search-form">
		<Input
			type="search"
			name="q"
			placeholder="Search by name or slug..."
			value={data.search}
			class="max-w-xs"
			data-testid="search-input"
		/>
		<Button type="submit" variant="outline" data-testid="search-button">Search</Button>
	</form>

	<!-- Team count -->
	<p class="text-muted-foreground mb-3 text-sm" data-testid="team-count">
		{data.teams.length} team{data.teams.length === 1 ? '' : 's'}
		{data.search ? `matching "${data.search}"` : 'total'}
	</p>

	<!-- Table (desktop) -->
	<div class="hidden lg:block" data-testid="teams-table-desktop">
		<div class="border-border overflow-hidden rounded-lg border">
			<table class="w-full text-sm">
				<thead class="bg-muted/50">
					<tr>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Team</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Slug</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Owner</th>
						<th class="text-muted-foreground px-4 py-3 text-center font-medium">Members</th>
						<th class="text-muted-foreground px-4 py-3 text-center font-medium">Setups</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Created</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.teams as team (team.id)}
						<tr class="hover:bg-muted/30 transition-colors" data-testid="team-row">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<Avatar class="h-8 w-8 flex-shrink-0">
										{#if team.avatarUrl}
											<AvatarImage src={team.avatarUrl} alt={team.name} />
										{/if}
										<AvatarFallback class="text-xs font-semibold">
											{team.name[0].toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<a
										href="/org/{team.slug}"
										class="text-foreground font-medium hover:underline"
										target="_blank"
										rel="noopener noreferrer"
										data-testid="team-name"
									>
										{team.name}
									</a>
								</div>
							</td>
							<td class="text-muted-foreground px-4 py-3 font-mono text-xs" data-testid="team-slug">
								{team.slug}
							</td>
							<td class="px-4 py-3">
								<a
									href="/{team.ownerUsername}"
									class="text-foreground hover:underline"
									target="_blank"
									rel="noopener noreferrer"
									data-testid="team-owner"
								>
									{team.ownerUsername}
								</a>
							</td>
							<td class="text-muted-foreground px-4 py-3 text-center" data-testid="team-members">
								{team.membersCount}
							</td>
							<td class="text-muted-foreground px-4 py-3 text-center" data-testid="team-setups">
								{team.setupsCount}
							</td>
							<td class="text-muted-foreground px-4 py-3" data-testid="team-created">
								{formatDate(team.createdAt)}
							</td>
							<td class="px-4 py-3">
								<Button
									variant="destructive"
									size="sm"
									onclick={() => openDeleteDialog(team.slug, team.name)}
									data-testid="delete-btn"
								>
									Delete
								</Button>
							</td>
						</tr>
					{/each}

					{#if data.teams.length === 0}
						<tr>
							<td
								colspan="7"
								class="text-muted-foreground px-4 py-8 text-center"
								data-testid="empty-state"
							>
								No teams found{data.search ? ` matching "${data.search}"` : ''}.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Mobile card list -->
	<div class="space-y-3 lg:hidden" data-testid="teams-list-mobile">
		{#each data.teams as team (team.id)}
			<div class="border-border rounded-lg border p-4" data-testid="team-card">
				<div class="mb-3 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<Avatar class="h-10 w-10 flex-shrink-0">
							{#if team.avatarUrl}
								<AvatarImage src={team.avatarUrl} alt={team.name} />
							{/if}
							<AvatarFallback class="font-semibold">
								{team.name[0].toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div>
							<a
								href="/org/{team.slug}"
								class="text-foreground font-medium hover:underline"
								target="_blank"
								rel="noopener noreferrer"
								data-testid="team-name"
							>
								{team.name}
							</a>
							<p class="text-muted-foreground font-mono text-xs" data-testid="team-slug">
								{team.slug}
							</p>
						</div>
					</div>
					<Button
						variant="destructive"
						size="sm"
						onclick={() => openDeleteDialog(team.slug, team.name)}
						data-testid="delete-btn"
					>
						Delete
					</Button>
				</div>

				<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					<dt class="text-muted-foreground">Owner</dt>
					<dd>
						<a
							href="/{team.ownerUsername}"
							class="text-foreground hover:underline"
							target="_blank"
							rel="noopener noreferrer"
							data-testid="team-owner"
						>
							{team.ownerUsername}
						</a>
					</dd>

					<dt class="text-muted-foreground">Members</dt>
					<dd class="text-foreground" data-testid="team-members">{team.membersCount}</dd>

					<dt class="text-muted-foreground">Setups</dt>
					<dd class="text-foreground" data-testid="team-setups">{team.setupsCount}</dd>

					<dt class="text-muted-foreground">Created</dt>
					<dd class="text-foreground" data-testid="team-created">{formatDate(team.createdAt)}</dd>
				</dl>
			</div>
		{/each}

		{#if data.teams.length === 0}
			<p class="text-muted-foreground py-8 text-center" data-testid="empty-state">
				No teams found{data.search ? ` matching "${data.search}"` : ''}.
			</p>
		{/if}
	</div>
</div>

<!-- Delete confirmation dialog -->
<AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteOpenChange}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
			<AlertDialogDescription>
				This action <strong>cannot be undone</strong>. It will permanently delete the team, all its
				setups, members, and invites.
			</AlertDialogDescription>
		</AlertDialogHeader>

		<div class="my-2 space-y-1.5">
			<Label for="delete-confirm-input">
				Type <strong>{deleteTarget?.name}</strong> to confirm:
			</Label>
			<Input
				id="delete-confirm-input"
				type="text"
				placeholder={deleteTarget?.name}
				bind:value={deleteConfirmInput}
				autocomplete="off"
			/>
			{#if form?.deleteError}
				<p class="text-sm text-destructive" role="alert">{form.deleteError}</p>
			{/if}
		</div>

		<AlertDialogFooter>
			<AlertDialogCancel type="button" onclick={() => handleDeleteOpenChange(false)}>
				Cancel
			</AlertDialogCancel>
			<form
				method="POST"
				action="?/deleteTeam"
				use:enhance={() => {
					deleting = true;
					return async ({ result, update }) => {
						deleting = false;
						if (result.type === 'success') {
							deleteDialogOpen = false;
							toast.success(`Team "${deleteTarget?.name}" deleted`);
						} else {
							toast.error('Failed to delete team');
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="slug" value={deleteTarget?.slug} />
				<input type="hidden" name="confirmName" value={deleteConfirmInput} />
				<Button type="submit" variant="destructive" disabled={!deleteConfirmValid || deleting}>
					{deleting ? 'Deleting...' : 'Delete team'}
				</Button>
			</form>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
