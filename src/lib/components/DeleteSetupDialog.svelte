<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import {
		AlertDialog,
		AlertDialogContent,
		AlertDialogHeader,
		AlertDialogFooter,
		AlertDialogTitle,
		AlertDialogDescription,
		AlertDialogCancel
	} from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	interface Props {
		open: boolean;
		slug: string;
		setupName: string;
		onOpenChange: (open: boolean) => void;
	}

	let { open, slug, setupName, onOpenChange }: Props = $props();

	let slugInput = $state('');
	let deleting = $state(false);

	const slugMatches = $derived(slugInput === slug);

	function handleOpenChange(value: boolean) {
		if (!value) {
			slugInput = '';
			deleting = false;
		}
		onOpenChange(value);
	}
</script>

<AlertDialog {open} onOpenChange={handleOpenChange}>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>Delete "{setupName}"?</AlertDialogTitle>
			<AlertDialogDescription>
				This action <strong>cannot be undone</strong>. All files, stars, comments, and tags
				associated with this setup will be permanently deleted.
			</AlertDialogDescription>
		</AlertDialogHeader>

		<form
			method="POST"
			action="?/delete"
			use:enhance={() => {
				deleting = true;
				return async ({ result, update }) => {
					deleting = false;
					if (result.type === 'redirect') {
						await goto(result.location);
					} else {
						await update();
					}
				};
			}}
		>
			<input type="hidden" name="slug" value={slug} />

			<div class="mb-4 space-y-1.5 gap-2 flex flex-col">
				<Label for="delete-slug-input">
					Type <strong>{slug}</strong> to confirm
				</Label>
				<Input
					id="delete-slug-input"
					type="text"
					placeholder={slug}
					bind:value={slugInput}
					autocomplete="off"
					data-testid="delete-slug-input"
				/>
			</div>

			<AlertDialogFooter>
				<AlertDialogCancel type="button" onclick={() => handleOpenChange(false)}>
					Cancel
				</AlertDialogCancel>
				<Button
					type="submit"
					variant="destructive"
					disabled={!slugMatches || deleting}
					data-testid="delete-confirm-btn"
				>
					{deleting ? 'Deleting…' : 'Delete setup'}
				</Button>
			</AlertDialogFooter>
		</form>
	</AlertDialogContent>
</AlertDialog>
