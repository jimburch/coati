<script lang="ts">
	import { timeAgo } from '$lib/utils';

	type UserSetup = {
		id: string;
		name: string;
		slug: string;
		description: string;
		display: string | null | undefined;
		visibility: 'public' | 'private';
		starsCount: number;
		updatedAt: Date;
	};

	type Props = {
		setups: UserSetup[];
		username: string;
	};

	const { setups, username }: Props = $props();
</script>

<div class="rounded-lg border border-border bg-card">
	<div class="flex items-center justify-between border-b border-border px-4 py-3">
		<h2 class="text-sm font-semibold text-foreground">Your Setups</h2>
		<a
			href="/{username}"
			class="text-xs text-muted-foreground transition-colors hover:text-foreground"
		>
			View all &rarr;
		</a>
	</div>
	<ul class="divide-y divide-border">
		{#each setups as setup (setup.id)}
			<li>
				<a
					href="/{username}/{setup.slug}"
					class="flex items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-accent/50"
				>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-foreground">
							{setup.display ?? setup.name}
						</p>
						<p class="truncate text-xs text-muted-foreground">{timeAgo(setup.updatedAt)}</p>
					</div>
					<div class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
						{#if setup.visibility === 'private'}
							<span
								class="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
							>
								Private
							</span>
						{/if}
						<span class="inline-flex items-center gap-0.5">
							<svg class="size-3" viewBox="0 0 16 16" fill="currentColor">
								<path
									d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"
								/>
							</svg>
							{setup.starsCount}
						</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
</div>
