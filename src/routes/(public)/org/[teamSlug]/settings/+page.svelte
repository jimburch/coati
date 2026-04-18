<script lang="ts">
	import { enhance } from '$app/forms';
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

	const team = $derived(data.team);
	const isOwner = $derived(data.isOwner);

	let saving = $state(false);
	let deleting = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteConfirmInput = $state('');

	const deleteConfirmValid = $derived(deleteConfirmInput === team.name);

	function handleDeleteOpenChange(open: boolean) {
		if (!open) {
			deleteConfirmInput = '';
			deleting = false;
		}
		deleteDialogOpen = open;
	}
</script>

<svelte:head>
	<title>Settings — {team.name} - Coati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-6 lg:py-10">
	<div class="mb-6">
		<a href="/org/{team.slug}" class="text-sm text-muted-foreground hover:text-foreground">
			← Back to {team.name}
		</a>
	</div>

	<h1 class="mb-8 text-2xl font-bold">Team Settings</h1>

	<div class="rounded-lg border border-border p-6">
		<h2 class="mb-1 text-lg font-semibold">General</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			Update your team's public profile. The team slug <span class="font-mono">@{team.slug}</span>
			cannot be changed.
		</p>

		{#if form?.updateError}
			<p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
				{form.updateError}
			</p>
		{/if}

		{#if form?.updateSuccess}
			<p
				class="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
			>
				Team settings saved.
			</p>
		{/if}

		<form
			method="POST"
			action="?/updateTeam"
			use:enhance={() => {
				saving = true;
				return async ({ update }) => {
					saving = false;
					await update({ reset: false });
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-1.5">
				<Label for="name">Team name</Label>
				<Input id="name" name="name" type="text" value={team.name} maxlength={100} required />
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
					maxlength={300}>{team.description ?? ''}</Textarea
				>
			</div>

			<div class="space-y-1.5">
				<Label for="avatarUrl">
					Avatar URL
					<span class="text-muted-foreground">(optional)</span>
				</Label>
				<Input
					id="avatarUrl"
					name="avatarUrl"
					type="url"
					placeholder="https://…"
					value={team.avatarUrl ?? ''}
				/>
			</div>

			<Button type="submit" disabled={saving}>
				{saving ? 'Saving…' : 'Save changes'}
			</Button>
		</form>
	</div>

	{#if isOwner}
		<div class="mt-8 rounded-lg border border-destructive/40 p-6">
			<h2 class="mb-1 text-lg font-semibold text-destructive">Danger zone</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				Deleting a team is permanent and removes all its setups, members, and invites.
			</p>
			<Button variant="destructive" size="sm" onclick={() => (deleteDialogOpen = true)}>
				Delete team
			</Button>
		</div>
	{/if}
</div>

<AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteOpenChange}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete "{team.name}"?</AlertDialogTitle>
			<AlertDialogDescription>
				This action <strong>cannot be undone</strong>. It will permanently delete the team, all its
				setups, members, and invites.
			</AlertDialogDescription>
		</AlertDialogHeader>

		<div class="my-2 space-y-1.5">
			<Label for="delete-confirm-input">
				Type <strong>{team.name}</strong> to confirm:
			</Label>
			<Input
				id="delete-confirm-input"
				type="text"
				placeholder={team.name}
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
						await update();
					};
				}}
			>
				<input type="hidden" name="confirmName" value={deleteConfirmInput} />
				<Button type="submit" variant="destructive" disabled={!deleteConfirmValid || deleting}>
					{deleting ? 'Deleting…' : 'Delete team'}
				</Button>
			</form>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
