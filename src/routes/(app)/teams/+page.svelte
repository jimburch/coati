<script lang="ts">
	import { enhance } from '$app/forms';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		AlertDialog,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogFooter,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogCancel
	} from '$lib/components/ui/alert-dialog';
	import type { PageData, ActionData } from './$types';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreateForm = $state(false);
	let creating = $state(false);
	let deleting = $state(false);

	let deleteDialogOpen = $state(false);
	let deleteTarget = $state<{ slug: string; name: string } | null>(null);
	let deleteConfirmInput = $state('');

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
</script>

<div class="mx-auto max-w-3xl px-4 py-6 lg:py-10">
	<div class="mb-6 flex items-center justify-between lg:mb-8">
		<h1 class="text-xl font-bold text-foreground lg:text-2xl">My Teams</h1>
		{#if data.hasBetaFeatures}
			<Button onclick={() => (showCreateForm = !showCreateForm)} variant="default" size="sm">
				{showCreateForm ? 'Cancel' : 'Create Team'}
			</Button>
		{/if}
	</div>

	<!-- Create team form -->
	{#if showCreateForm && data.hasBetaFeatures}
		<div class="mb-6 rounded-lg border border-border bg-card p-4 lg:mb-8 lg:p-6">
			<h2 class="mb-4 text-base font-semibold text-foreground">Create a new team</h2>
			<form
				method="POST"
				action="?/createTeam"
				use:enhance={() => {
					creating = true;
					return async ({ update }) => {
						creating = false;
						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-1.5">
					<Label for="name">Team name</Label>
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="Acme Corp"
						value={form?.fields?.name ?? ''}
						maxlength={100}
						required
					/>
				</div>

				<div class="space-y-1.5">
					<Label for="slug">Slug</Label>
					<Input
						id="slug"
						name="slug"
						type="text"
						placeholder="acme-corp"
						value={form?.fields?.slug ?? ''}
						maxlength={100}
						required
					/>
					<p class="text-xs text-muted-foreground">
						Lowercase letters, numbers, and hyphens only. Used in URLs: /org/your-slug
					</p>
				</div>

				<div class="space-y-1.5">
					<Label for="description">
						Description
						<span class="text-muted-foreground">(optional)</span>
					</Label>
					<Textarea
						id="description"
						name="description"
						placeholder="What does your team work on?"
						rows={2}
						maxlength={300}>{form?.fields?.description ?? ''}</Textarea
					>
				</div>

				{#if form?.createError}
					<p class="text-sm text-destructive" role="alert">{form.createError}</p>
				{/if}

				<Button type="submit" disabled={creating}>
					{creating ? 'Creating...' : 'Create team'}
				</Button>
			</form>
		</div>
	{/if}

	<!-- Teams list -->
	{#if data.myTeams.length > 0}
		<div class="space-y-3">
			{#each data.myTeams as team (team.id)}
				<div class="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
					<Avatar class="h-10 w-10 flex-shrink-0">
						{#if team.avatarUrl}
							<AvatarImage src={team.avatarUrl} alt={team.name} />
						{/if}
						<AvatarFallback class="font-semibold">
							{team.name[0].toUpperCase()}
						</AvatarFallback>
					</Avatar>

					<div class="min-w-0 flex-1">
						<a
							href="/org/{team.slug}"
							class="block truncate text-sm font-semibold text-foreground hover:text-primary"
						>
							{team.name}
						</a>
						{#if team.description}
							<p class="mt-0.5 truncate text-xs text-muted-foreground">{team.description}</p>
						{/if}
						<p class="mt-0.5 text-xs text-muted-foreground">
							{team.membersCount}
							{team.membersCount === 1 ? 'member' : 'members'}
							&middot;
							<span class="capitalize">{team.role}</span>
						</p>
					</div>

					<div class="flex flex-shrink-0 items-center gap-2">
						<a href="/org/{team.slug}">
							<Button variant="outline" size="sm">View</Button>
						</a>
						{#if team.ownerId === data.user?.id}
							<Button
								variant="destructive"
								size="sm"
								onclick={() => openDeleteDialog(team.slug, team.name)}
							>
								Delete
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="rounded-lg border border-dashed border-border py-12 text-center">
			<p class="text-muted-foreground">You haven't joined any teams yet.</p>
			{#if data.hasBetaFeatures}
				<Button variant="outline" size="sm" class="mt-3" onclick={() => (showCreateForm = true)}>
					Create your first team
				</Button>
			{/if}
		</div>
	{/if}
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
					return async ({ update }) => {
						deleting = false;
						deleteDialogOpen = false;
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
