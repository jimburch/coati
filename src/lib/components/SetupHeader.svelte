<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import AgentIcon from '$lib/components/AgentIcon.svelte';
	import { enhance } from '$app/forms';
	import { timeAgo } from '$lib/utils';

	interface SetupProp {
		display: string | null;
		name: string;
		description: string | null;
		ownerUsername: string;
		ownerAvatarUrl: string | null;
	}

	interface AgentProp {
		id: string | number;
		slug: string;
		displayName: string;
	}

	interface Props {
		setup: SetupProp;
		agents: AgentProp[];
		isOwner: boolean;
		updatedAt: Date;
		children?: Snippet;
	}

	const { setup, agents, isOwner, updatedAt, children }: Props = $props();

	let aboutEditMode = $state(false);
	let aboutDisplayInput = $state('');
	let aboutDescriptionInput = $state('');
	let aboutSaving = $state(false);
	let localAboutDisplay = $state<string | null>(null);
	let localAboutDescription = $state<string | null>(null);

	const displayedAboutDisplay = $derived(
		localAboutDisplay !== null ? localAboutDisplay : (setup.display ?? setup.name)
	);
	const displayedAboutDescription = $derived(
		localAboutDescription !== null ? localAboutDescription : (setup.description ?? '')
	);

	function startAboutEdit() {
		aboutDisplayInput = displayedAboutDisplay;
		aboutDescriptionInput = displayedAboutDescription;
		aboutEditMode = true;
	}

	function cancelAboutEdit() {
		aboutEditMode = false;
	}
</script>

<div class="mb-6 border-b border-border pb-6 lg:mb-8 lg:pb-8" data-testid="setup-header">
	<div class="flex items-start justify-between gap-4">
		<!-- Left: display name + description (editable for owners) -->
		<div class="min-w-0 flex-1">
			{#if !aboutEditMode}
				<div class="flex items-center gap-2">
					<h1 class="text-xl font-bold lg:text-2xl">{displayedAboutDisplay}</h1>
					{#if isOwner}
						<button
							onclick={startAboutEdit}
							class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
							aria-label="Edit about section"
							data-testid="edit-about-btn"
						>
							<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
								<path
									d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"
								/>
							</svg>
						</button>
					{/if}
				</div>
				{#if displayedAboutDescription}
					<p class="mt-1 text-sm text-muted-foreground">{displayedAboutDescription}</p>
				{/if}

				<!-- Author + agents + stats row -->
				<div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
					<!-- Author -->
					<a
						href="/{setup.ownerUsername}"
						class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
					>
						<Avatar class="size-5">
							<AvatarImage src={setup.ownerAvatarUrl} alt={setup.ownerUsername} />
							<AvatarFallback>{setup.ownerUsername[0].toUpperCase()}</AvatarFallback>
						</Avatar>
						<span class="font-medium">{setup.ownerUsername}</span>
					</a>

					<!-- Agent badges -->
					{#each agents as agent (agent.id)}
						<a
							href="/agents/{agent.slug}"
							class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
						>
							<AgentIcon slug={agent.slug} size={12} />
							{agent.displayName}
						</a>
					{/each}

					<span class="text-xs text-muted-foreground">·</span>
					<span class="text-xs text-muted-foreground">
						updated {timeAgo(updatedAt)}
					</span>
				</div>
			{:else}
				<!-- About edit form -->
				<form
					method="POST"
					action="?/saveAbout"
					data-testid="about-editor"
					use:enhance={() => {
						aboutSaving = true;
						return async ({ result, update }) => {
							aboutSaving = false;
							if (result.type === 'success' && result.data) {
								localAboutDisplay = (result.data.display as string | null) ?? null;
								localAboutDescription = (result.data.description as string | null) ?? null;
								aboutEditMode = false;
							}
							await update({ reset: false });
						};
					}}
				>
					<div class="space-y-2">
						<div>
							<label for="about-display" class="mb-1 block text-xs font-medium">Display name</label>
							<input
								id="about-display"
								name="display"
								type="text"
								maxlength="150"
								required
								bind:value={aboutDisplayInput}
								class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								data-testid="about-display-input"
							/>
						</div>
						<div>
							<label for="about-description" class="mb-1 block text-xs font-medium"
								>Description</label
							>
							<textarea
								id="about-description"
								name="description"
								maxlength="300"
								rows={3}
								bind:value={aboutDescriptionInput}
								class="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								data-testid="about-description-textarea"
							></textarea>
						</div>
						<div class="flex gap-2">
							<Button type="submit" size="sm" disabled={aboutSaving} data-testid="save-about-btn">
								{aboutSaving ? 'Saving…' : 'Save'}
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onclick={cancelAboutEdit}
								data-testid="cancel-about-btn"
							>
								Cancel
							</Button>
						</div>
					</div>
				</form>
			{/if}
		</div>

		<!-- Right: Star button via children snippet -->
		<div class="shrink-0">
			{@render children?.()}
		</div>
	</div>
</div>
