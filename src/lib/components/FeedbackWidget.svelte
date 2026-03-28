<script lang="ts">
	import { page } from '$app/state';
	import { MessageSquarePlus, Check, Bug, Lightbulb, Sparkles } from '@lucide/svelte';
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import DialogContent from './ui/dialog/dialog-content.svelte';
	import DialogTitle from './ui/dialog/dialog-title.svelte';
	import Button from './ui/button/button.svelte';
	import Input from './ui/input/input.svelte';
	import Textarea from './ui/textarea/textarea.svelte';
	import type { LayoutUser } from '$lib/types';

	interface Props {
		user: LayoutUser | null;
	}

	const { user }: Props = $props();

	type Category = 'bug' | 'improvement' | 'feature-request';
	type Step = 'category' | 'form' | 'success';

	let open = $state(false);
	let step = $state<Step>('category');
	let category = $state<Category | null>(null);
	let title = $state('');
	let description = $state('');
	let pageUrl = $state('');
	let submitting = $state(false);
	let errorMsg = $state('');

	const visible = $derived(
		user !== null && user.isBetaApproved && page.url.pathname !== '/waitlist'
	);

	const CATEGORIES: { value: Category; label: string; icon: typeof Bug; description: string }[] = [
		{ value: 'bug', label: 'Bug', icon: Bug, description: 'Something is broken' },
		{
			value: 'improvement',
			label: 'Improvement',
			icon: Lightbulb,
			description: 'Make something better'
		},
		{
			value: 'feature-request',
			label: 'Feature Request',
			icon: Sparkles,
			description: 'Something new'
		}
	];

	function openModal() {
		pageUrl = window.location.href;
		step = 'category';
		category = null;
		title = '';
		description = '';
		errorMsg = '';
		open = true;
	}

	function selectCategory(cat: Category) {
		category = cat;
		step = 'form';
	}

	function goBack() {
		step = 'category';
		errorMsg = '';
	}

	async function submit() {
		if (!category || !title.trim() || !description.trim()) return;

		submitting = true;
		errorMsg = '';

		try {
			const res = await fetch('/api/v1/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					category,
					title: title.trim(),
					description: description.trim(),
					pageUrl
				})
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = (body as { error?: string }).error ?? 'Something went wrong. Please try again.';
				return;
			}

			step = 'success';
			setTimeout(() => {
				open = false;
			}, 2000);
		} catch {
			errorMsg = 'Network error. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function onOpenChange(value: boolean) {
		open = value;
		if (!value) {
			// reset after close animation
			setTimeout(() => {
				step = 'category';
				category = null;
				title = '';
				description = '';
				errorMsg = '';
			}, 200);
		}
	}
</script>

{#if visible}
	<DialogPrimitive.Root bind:open {onOpenChange}>
		<DialogPrimitive.Trigger
			onclick={openModal}
			class="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			data-testid="feedback-widget"
			aria-label="Send feedback"
		>
			<MessageSquarePlus class="size-6" />
		</DialogPrimitive.Trigger>

		<DialogContent class="max-w-md">
			{#if step === 'category'}
				<DialogTitle>Share feedback</DialogTitle>
				<p class="text-sm text-muted-foreground">What kind of feedback do you have?</p>
				<div class="mt-2 flex flex-col gap-2">
					{#each CATEGORIES as cat (cat.value)}
						<button
							onclick={() => selectCategory(cat.value)}
							class="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							data-testid="category-{cat.value}"
						>
							<cat.icon class="size-5 shrink-0 text-muted-foreground" />
							<div>
								<div class="font-medium">{cat.label}</div>
								<div class="text-xs text-muted-foreground">{cat.description}</div>
							</div>
						</button>
					{/each}
				</div>
			{:else if step === 'form'}
				<DialogTitle>
					{CATEGORIES.find((c) => c.value === category)?.label ?? 'Feedback'}
				</DialogTitle>
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<label for="feedback-title" class="text-sm font-medium">Title</label>
						<Input
							id="feedback-title"
							bind:value={title}
							placeholder="Brief summary"
							maxlength={200}
							data-testid="feedback-title"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="feedback-description" class="text-sm font-medium">Description</label>
						<Textarea
							id="feedback-description"
							bind:value={description}
							placeholder="Describe in more detail…"
							rows={4}
							maxlength={2000}
							data-testid="feedback-description"
						/>
					</div>
					<p class="truncate text-xs text-muted-foreground" data-testid="feedback-page-url">
						{pageUrl}
					</p>
					{#if errorMsg}
						<p class="text-sm text-destructive" data-testid="feedback-error">{errorMsg}</p>
					{/if}
					<div class="flex gap-2">
						<Button variant="outline" onclick={goBack} class="flex-1">Back</Button>
						<Button
							onclick={submit}
							disabled={submitting || !title.trim() || !description.trim()}
							class="flex-1"
							data-testid="feedback-submit"
						>
							{submitting ? 'Submitting…' : 'Submit'}
						</Button>
					</div>
				</div>
			{:else if step === 'success'}
				<div
					class="flex flex-col items-center gap-3 py-4 text-center"
					data-testid="feedback-success"
				>
					<div
						class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
					>
						<Check class="size-6" />
					</div>
					<DialogTitle>Feedback submitted!</DialogTitle>
					<p class="text-sm text-muted-foreground">Thanks for helping us improve Coati.</p>
				</div>
			{/if}
		</DialogContent>
	</DialogPrimitive.Root>
{/if}
