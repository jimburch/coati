<script lang="ts">
	import { enhance, deserialize } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		shouldRenderReadmeSection,
		shouldShowAddReadmeCard,
		isSaveDisabled
	} from './readmeSectionView';

	interface Props {
		readmeHtml: string | null;
		readmeRaw: string | null;
		isOwner: boolean;
		onSaved: (update: { updatedAt: Date | null }) => void;
	}

	const { readmeHtml, readmeRaw, isOwner, onSaved }: Props = $props();

	let editMode = $state(false);
	let editTab = $state<'edit' | 'preview'>('edit');
	let editContent = $state('');
	let saving = $state(false);
	let previewing = $state(false);
	let previewHtml = $state<string | null>(null);
	let localReadmeHtml = $state<string | null>(null);
	let localReadmeRaw = $state<string | null>(null);
	let sourceHadReadme = $state(false);

	const displayedReadmeHtml = $derived(localReadmeHtml !== null ? localReadmeHtml : readmeHtml);
	const displayedReadmeRaw = $derived(localReadmeRaw !== null ? localReadmeRaw : readmeRaw);
	const renderSection = $derived(
		shouldRenderReadmeSection({ isOwner, readmeHtml: displayedReadmeHtml })
	);
	const showAddReadmeCard = $derived(
		shouldShowAddReadmeCard({ isOwner, readmeHtml: displayedReadmeHtml })
	);
	const saveDisabled = $derived(
		isSaveDisabled({ sourceHadReadme, textareaContent: editContent, saving })
	);

	function startEdit() {
		editContent = displayedReadmeRaw ?? '';
		sourceHadReadme = !!displayedReadmeRaw && displayedReadmeRaw.trim() !== '';
		editTab = 'edit';
		previewHtml = null;
		editMode = true;
	}

	function cancelEdit() {
		editMode = false;
	}
</script>

{#if !editMode && renderSection}
	<!-- View mode -->
	{#if displayedReadmeHtml}
		{#if isOwner}
			<div class="mb-2 flex items-center justify-end">
				<Button variant="outline" size="sm" onclick={startEdit} data-testid="edit-readme-btn">
					Edit
				</Button>
			</div>
		{/if}
		<div
			class="prose dark:prose-invert max-w-none [&_pre]:!bg-secondary [&_h1]:mt-0 [&_h1]:mb-3 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:my-2 [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_li>p]:my-0"
		>
			{@html displayedReadmeHtml}
		</div>
	{:else if showAddReadmeCard}
		<div
			class="rounded-lg border border-dashed border-border bg-card p-6 text-center lg:p-8"
			data-testid="add-readme-card"
		>
			<p class="mb-3 text-sm text-muted-foreground">Help others understand what your setup does.</p>
			<Button variant="outline" size="sm" onclick={startEdit} data-testid="add-readme-btn">
				Add a README
			</Button>
		</div>
	{/if}
{:else if editMode}
	<!-- Edit mode -->
	<div class="space-y-3" data-testid="readme-editor">
		<!-- Tab bar -->
		<div class="flex items-center gap-2 border-b border-border pb-2">
			<button
				class="rounded-md px-3 py-1 text-sm font-medium transition-colors {editTab === 'edit'
					? 'bg-secondary text-secondary-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={() => {
					editTab = 'edit';
				}}
				data-testid="tab-edit"
			>
				Edit
			</button>
			<button
				class="rounded-md px-3 py-1 text-sm font-medium transition-colors {editTab === 'preview'
					? 'bg-secondary text-secondary-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
				onclick={async () => {
					editTab = 'preview';
					previewing = true;
					previewHtml = null;
					try {
						const fd = new FormData();
						fd.append('readme', editContent);
						const res = await fetch('?/previewReadme', { method: 'POST', body: fd });
						const result = deserialize(await res.text());
						previewHtml =
							result.type === 'success'
								? ((result.data?.previewHtml as string | null) ?? null)
								: null;
					} finally {
						previewing = false;
					}
				}}
				data-testid="tab-preview"
			>
				Preview
			</button>
		</div>

		{#if editTab === 'edit'}
			<textarea
				class="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				rows={20}
				bind:value={editContent}
				data-testid="readme-textarea"
				placeholder="Write your README in Markdown..."
			></textarea>
		{:else}
			<div class="min-h-[200px] rounded-md border border-border bg-card p-4">
				{#if previewing}
					<p class="text-sm text-muted-foreground">Rendering preview...</p>
				{:else if previewHtml}
					<div
						class="prose dark:prose-invert max-w-none [&_pre]:!bg-secondary [&_h1]:mt-0 [&_h1]:mb-3 [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:my-2 [&_p]:leading-relaxed [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_li>p]:my-0"
					>
						{@html previewHtml}
					</div>
				{:else}
					<p class="text-sm italic text-muted-foreground">Nothing to preview.</p>
				{/if}
			</div>
		{/if}

		<!-- Save / Cancel -->
		<form
			method="POST"
			action="?/saveReadme"
			use:enhance={() => {
				saving = true;
				const submittedContent = editContent;
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success' && result.data) {
						const nextHtml = (result.data.readmeHtml as string | null) ?? null;
						// Empty-string override signals "locally cleared" (vs. null = no override);
						// keeps displayedReadmeHtml in sync with the deletion instead of falling back to the prop.
						localReadmeHtml = nextHtml === null ? '' : nextHtml;
						localReadmeRaw = nextHtml === null ? '' : submittedContent;
						const updatedAt = result.data.updatedAt
							? new Date(result.data.updatedAt as string)
							: null;
						editMode = false;
						onSaved({ updatedAt });
					}
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="readme" value={editContent} />
			<div class="flex gap-2">
				<Button type="submit" size="sm" disabled={saveDisabled} data-testid="save-readme-btn">
					{saving ? 'Saving…' : 'Save'}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onclick={cancelEdit}
					data-testid="cancel-readme-btn"
				>
					Cancel
				</Button>
			</div>
		</form>
	</div>
{/if}
