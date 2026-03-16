<script lang="ts">
	import type { SetupCardProps } from '$lib/types';
	import { timeAgo } from '$lib/utils';

	type Props = {
		setup: SetupCardProps;
		username: string;
		showAuthor?: boolean;
	};

	const { setup, username, showAuthor = false }: Props = $props();
</script>

<a
	href="/{username}/{setup.slug}"
	class="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/50"
>
	<h3 class="truncate text-base font-semibold text-foreground">{setup.name}</h3>

	{#if setup.description}
		<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{setup.description}</p>
	{/if}

	{#if showAuthor}
		<p class="mt-2 text-xs text-muted-foreground">by {username}</p>
	{/if}

	<div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
		<span class="inline-flex items-center gap-1">
			<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
				/>
			</svg>
			{setup.starsCount}
		</span>

		<span class="inline-flex items-center gap-1">
			<svg class="size-3.5" viewBox="0 0 16 16" fill="currentColor">
				<path
					d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"
				/>
				<path
					d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"
				/>
			</svg>
			{setup.clonesCount}
		</span>

		<span class="ml-auto">{timeAgo(setup.updatedAt)}</span>
	</div>
</a>
